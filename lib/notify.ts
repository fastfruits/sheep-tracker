import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { rankAnimals } from '@/lib/matching';
import { describeMarking, parseMarkings, type Marking } from '@/lib/markings';
import type { RegisteredAnimal, Species } from '@/lib/types';

/**
 * Sighting → farmer alert fan-out.
 *
 * Deliberately free of every `next/*` import, which is the whole point of it
 * living here rather than inside the Server Action. `app/actions/report.ts`
 * cannot be imported by a test runner: it calls `cookies()` on its first line
 * and `revalidatePath()` on its last. This module can, so the matching rules
 * and the alert-writing behaviour are directly testable with no mocking.
 *
 * Never call `after()` from here — it needs the request work store and would
 * throw or silently no-op. Deferred work belongs in the action layer.
 */

export interface NotifyInput {
  postId: string;
  /**
   * The reporter, so they are not alerted about their own sighting. A farmer
   * reporting their own escaped sheep used to notify themselves and light
   * their own nav badge.
   */
  reporterId: string;
  species: Species;
  primaryColor: string;
  /** Structured markings from the report. Drives ranking and rule-outs. */
  markings?: Marking[];
  reporterName: string;
  caption: string;
  locationLabel: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface NotifyDeps {
  /** Defaults to the service-role client. Injectable so tests can force failures. */
  db?: SupabaseClient;
}

export interface MatchedAnimal {
  id: string;
  name: string;
  ownerName: string;
  farmName?: string;
  /**
   * How much the structured markings corroborated this match. The reporter's
   * confirmation screen leads with the strong ones, so a farmer whose animal
   * merely shares a colour is not presented as a certainty.
   */
  confidence: 'strong' | 'likely' | 'possible';
  /** Plain-English list of the markings that lined up, for the reporter. */
  matchedMarkings: string[];
}

export interface NotifyResult {
  /** Registered animals this sighting might be. Drives the reporter's confirmation UI. */
  matched: MatchedAnimal[];
  /**
   * Alert rows actually written. Distinct from `matched.length`, because the
   * insert can fail — and used to fail on every single report, silently, on a
   * database missing the detail columns. Callers must not claim delivery
   * unless this is greater than zero.
   */
  notified: number;
  /** Anything that went wrong. Empty on a clean run. */
  errors: string[];
}

export async function notifyMatchingFarmers(
  input: NotifyInput,
  deps: NotifyDeps = {}
): Promise<NotifyResult> {
  const errors: string[] = [];

  let db: SupabaseClient;
  if (deps.db) {
    db = deps.db;
  } else {
    try {
      db = createAdminClient();
    } catch (e) {
      // Without the service-role key we cannot match or notify. The sighting is
      // still saved and visible in the feed; only the farmer alert is skipped.
      const message = `matching skipped: ${(e as Error).message}`;
      console.error(message);
      return { matched: [], notified: 0, errors: [message] };
    }
  }

  // Service-role read across owners: `animals` is owner-only under RLS, which
  // is precisely why matching cannot run as the reporter's session.
  // `.neq('owner_id', …)` is what stops a farmer being alerted about the
  // sighting they just filed themselves.
  const { data: rows, error: readError } = await db
    .from('animals')
    .select('*, profiles!animals_owner_id_fkey(name, farm_name)')
    .eq('species', input.species)
    .neq('owner_id', input.reporterId);

  if (readError) {
    const message = `animals read: ${readError.message}`;
    console.error(message);
    return { matched: [], notified: 0, errors: [message] };
  }

  const animals: RegisteredAnimal[] = (rows ?? []).map(a => ({
    id: a.id,
    ownerId: a.owner_id,
    ownerName: a.profiles?.name ?? 'Unknown',
    farmName: a.profiles?.farm_name ?? undefined,
    species: a.species,
    name: a.name,
    primaryColor: a.primary_color,
    markings: a.markings,
    // Animals registered before markings were structured have no JSON here.
    // parseMarkings turns that into [], which scores 0 and leaves the colour
    // rule to decide — exactly the behaviour those rows had before.
    markingDetails: parseMarkings(a.markings_details),
    markingNotes: a.marking_notes ?? undefined,
    tagNumber: a.tag_number ?? undefined,
  }));

  const ranked = rankAnimals(
    {
      species: input.species,
      primaryColor: input.primaryColor,
      markings: input.markings ?? [],
    },
    animals
  );
  if (ranked.length === 0) return { matched: [], notified: 0, errors };

  const matches = ranked.map(r => r.animal);
  const matched: MatchedAnimal[] = ranked.map(r => ({
    id: r.animal.id,
    name: r.animal.name,
    ownerName: r.animal.ownerName,
    farmName: r.animal.farmName,
    confidence: r.confidence,
    matchedMarkings: r.matchedMarkings.map(describeMarking),
  }));

  const { data: inserted, error: insertError } = await db
    .from('notifications')
    .insert(
      matches.map(animal => ({
        farmer_id: animal.ownerId,
        post_id: input.postId,
        animal_id: animal.id,
        animal_name: animal.name,
        species: animal.species,
        reporter_name: input.reporterName,
        reporter_caption: input.caption,
        reported_markings: (input.markings ?? []).map(describeMarking).join(', ') || null,
        location_label: input.locationLabel,
        latitude: input.latitude,
        longitude: input.longitude,
      }))
    )
    .select('id');

  if (insertError) {
    const message = `notifications insert: ${insertError.message}`;
    console.error(message);
    errors.push(message);
    // `matched` is still returned — the match itself was real and the reporter
    // deserves to know what the animal probably is. But `notified: 0` means the
    // UI must not tell them the farmer heard about it.
    return { matched, notified: 0, errors };
  }

  return { matched, notified: inserted?.length ?? 0, errors };
}
