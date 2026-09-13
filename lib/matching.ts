import type { RegisteredAnimal, Species } from './types';
import type { Marking, MarkingLocation } from './markings';

export interface SightingDescription {
  species: Species;
  primaryColor: string;
  /** Structured markings the reporter picked. Absent on legacy free-text rows. */
  markings?: Marking[];
}

export type MatchConfidence = 'strong' | 'likely' | 'possible';

export interface AnimalMatch {
  animal: RegisteredAnimal;
  /** Sum of the best per-marking score. 0 when nothing structured lined up. */
  score: number;
  confidence: MatchConfidence;
  /** Reported markings that corroborated a registered one. */
  matchedMarkings: Marking[];
  /** Reported markings that directly contradicted a registered one. */
  conflictingMarkings: Marking[];
  /** Whether the colour rule alone would have kept this animal. */
  colorMatched: boolean;
}

/** Same tag, same colour, same place — the strongest signal available. */
const SCORE_EXACT = 3;
/** Same tag and colour, but one side did not say where. */
const SCORE_LOCATION_UNSTATED = 2;
/** Same tag and colour in different places. Suggestive, not conclusive. */
const SCORE_LOCATION_DIFFERS = 1;
/** Same tag in the same place, different colour. Not a weak match — a denial. */
const CONFLICT = -1;

/** Ear positions overlap: "both ears" satisfies a left-ear or right-ear claim. */
const EAR_LOCATIONS: MarkingLocation[] = ['left_ear', 'right_ear', 'both_ears'];

function locationsAgree(a: MarkingLocation, b: MarkingLocation): boolean {
  if (a === b) return true;
  if (a === 'both_ears' && EAR_LOCATIONS.includes(b)) return true;
  if (b === 'both_ears' && EAR_LOCATIONS.includes(a)) return true;
  return false;
}

/**
 * Score one reported marking against one registered marking.
 *
 * Returns `CONFLICT` only for a same-type, same-place, different-colour pair —
 * a yellow left-ear tag where the farmer registered a blue one. Everything
 * softer scores 0, because a reporter who missed a marking is far more common
 * than a reporter who invented a contradictory one.
 */
function pairScore(reported: Marking, registered: Marking): number {
  if (reported.type !== registered.type) return 0;

  const locationUnstated =
    reported.location === 'unknown' || registered.location === 'unknown';
  const agree = locationsAgree(reported.location, registered.location);

  if (reported.color === registered.color) {
    if (agree) return SCORE_EXACT;
    if (locationUnstated) return SCORE_LOCATION_UNSTATED;
    return SCORE_LOCATION_DIFFERS;
  }

  // Same type, different colour. A definite colour clash in a definite place
  // is the one case where structured markings should rule an animal out.
  if (!locationUnstated && agree) return CONFLICT;
  return 0;
}

function colorsOverlap(reported: string, registered: string): boolean {
  const a = reported.toLowerCase();
  const b = registered.toLowerCase();
  return (
    a.includes(b) ||
    b.includes(a) ||
    a.split(/\s+/).some(word => word.length > 2 && b.includes(word))
  );
}

/**
 * Decide which registered animals a sighting might be, and how strongly.
 *
 * The colour rule is unchanged from the React Native build — same species, and
 * colours that overlap in either direction or share a word longer than two
 * characters ("black and white" matches "white"). It is deliberately loose and
 * over-matches on purpose.
 *
 * Structured markings now sit on top of it and do three things the loose colour
 * rule could not:
 *
 *   1. RANK. A sighting that names the same ear tag as a registered animal
 *      outranks one that merely shares a colour, so the farmer sees the real
 *      candidate first.
 *   2. RESCUE. A strong marking match keeps an animal whose registered colour
 *      disagrees — people describe the same fleece as "white", "cream" and
 *      "dirty white", but a yellow left-ear tag is a yellow left-ear tag.
 *   3. RULE OUT. A marking that contradicts the registered one, with nothing
 *      else corroborating, drops the animal instead of alerting the farmer.
 *
 * Free-text marking notes are never consulted; that is the whole point.
 */
export function rankAnimals(
  sighting: SightingDescription,
  animals: RegisteredAnimal[]
): AnimalMatch[] {
  const reportedColor = (sighting.primaryColor || '').trim().toLowerCase();
  const reportedMarkings = sighting.markings ?? [];

  // Without this guard an empty colour matches *every* animal of the species,
  // because `registered.includes('')` is always true — so one blank field would
  // alert every farmer who keeps sheep. A sighting carrying structured markings
  // can still get through on those alone.
  if (!reportedColor && reportedMarkings.length === 0) return [];

  const results: AnimalMatch[] = [];

  for (const animal of animals) {
    if (animal.species !== sighting.species) continue;

    const colorMatched =
      !!reportedColor && colorsOverlap(reportedColor, animal.primaryColor);

    const registeredMarkings = animal.markingDetails ?? [];
    const matchedMarkings: Marking[] = [];
    const conflictingMarkings: Marking[] = [];
    let score = 0;

    for (const reported of reportedMarkings) {
      // Best pair wins, but a conflict anywhere is recorded: an animal with
      // two blue tags and one yellow one should not launder the clash away.
      let best = 0;
      let conflicted = false;
      for (const registered of registeredMarkings) {
        const pair = pairScore(reported, registered);
        if (pair === CONFLICT) conflicted = true;
        else if (pair > best) best = pair;
      }
      if (best > 0) {
        score += best;
        matchedMarkings.push(reported);
      } else if (conflicted) {
        conflictingMarkings.push(reported);
      }
    }

    // A contradiction with nothing corroborating it means this is a different
    // animal. Alerting the farmer here is the noise the structured fields exist
    // to remove.
    if (conflictingMarkings.length > 0 && score === 0) continue;

    // Colour is still the baseline gate, but an exact marking match overrides
    // it rather than being wasted.
    if (!colorMatched && score < SCORE_EXACT) continue;

    results.push({
      animal,
      score,
      confidence: score >= SCORE_EXACT ? 'strong' : score > 0 ? 'likely' : 'possible',
      matchedMarkings,
      conflictingMarkings,
      colorMatched,
    });
  }

  // Stable sort: equal-scoring animals keep the order the database returned,
  // which is what the existing tests and the farmer's alert list expect.
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Backwards-compatible view of {@link rankAnimals}: the matching animals only,
 * best first. Returns the caller's own objects, since `.ownerId` is read off
 * them to address notification rows.
 */
export function matchAnimals(
  sighting: SightingDescription,
  animals: RegisteredAnimal[]
): RegisteredAnimal[] {
  return rankAnimals(sighting, animals).map(m => m.animal);
}
