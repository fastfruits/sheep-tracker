import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { matchAnimals } from '@/lib/matching';
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
    tagNumber: a.tag_number ?? undefined,
  }));

  const matches = matchAnimals(
    { species: input.species, primaryColor: input.primaryColor },
    animals
  );
  if (matches.length === 0) return { matched: [], notified: 0, errors };

  const matched: MatchedAnimal[] = matches.map(m => ({
    id: m.id,
    name: m.name,
    ownerName: m.ownerName,
    farmName: m.farmName,
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
