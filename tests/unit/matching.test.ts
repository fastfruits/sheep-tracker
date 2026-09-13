import { describe, expect, it } from 'vitest';
import { matchAnimals, rankAnimals } from '@/lib/matching';
import type { Marking } from '@/lib/markings';
import type { RegisteredAnimal, Species } from '@/lib/types';

/**
 * Pure tests for the match rules. No database, no env, no request context.
 *
 * The rule under test (lib/matching.ts) is deliberately loose — it was ported
 * verbatim from the React Native build and is meant to over-match rather than
 * miss a real sighting. Several tests below pin that looseness on purpose, so
 * that tightening it later shows up as a deliberate diff rather than a
 * surprise.
 */

function animal(overrides: Partial<RegisteredAnimal> = {}): RegisteredAnimal {
  return {
    id: 'animal-1',
    ownerId: 'owner-1',
    ownerName: 'Test Farmer',
    species: 'sheep',
    name: 'Dolly',
    primaryColor: 'white',
    markings: '',
    markingDetails: [],
    ...overrides,
  };
}

function match(
  species: Species,
  primaryColor: string,
  animals: RegisteredAnimal[],
  markings: Marking[] = []
) {
  return matchAnimals({ species, primaryColor, markings }, animals);
}

/** Shorthand for a marking; location defaults to the "not sure" answer. */
function mark(
  type: Marking['type'],
  color: Marking['color'],
  location: Marking['location'] = 'unknown'
): Marking {
  return { type, color, location };
}

describe('matchAnimals', () => {
  it('matches an exact colour on the same species', () => {
    const a = animal();
    expect(match('sheep', 'white', [a])).toEqual([a]);
  });

  it('does not match a different species, even with an identical colour', () => {
    expect(match('cow', 'white', [animal({ species: 'sheep' })])).toEqual([]);
  });

  it('matches when the reported colour contains the registered one', () => {
    // "black and white" sighting vs a "white" animal.
    const a = animal({ primaryColor: 'white' });
    expect(match('sheep', 'black and white', [a])).toEqual([a]);
  });

  it('matches when the registered colour contains the reported one', () => {
    // "white" sighting vs a "black and white" animal.
    const a = animal({ primaryColor: 'black and white' });
    expect(match('sheep', 'white', [a])).toEqual([a]);
  });

  it('is case-insensitive in both directions', () => {
    const a = animal({ primaryColor: 'White' });
    expect(match('sheep', 'WHITE', [a])).toEqual([a]);
  });

  it('matches on a shared word longer than two characters', () => {
    const a = animal({ primaryColor: 'brown patches' });
    expect(match('sheep', 'tan brown', [a])).toEqual([a]);
  });

  it('ignores words of two characters or fewer', () => {
    // "or" is a substring of "orange", but it is a 2-char word and must be
    // skipped. This is the test that fires if the `length > 2` cutoff is ever
    // relaxed to `> 1` — which would make half the dictionary match.
    expect(match('sheep', 'red or tan', [animal({ primaryColor: 'orange' })])).toEqual([]);
  });

  it('returns nothing for an empty colour rather than matching every animal', () => {
    // Without the guard, `registered.includes('')` is always true, so one blank
    // field would alert every farmer who keeps sheep.
    const animals = [animal({ id: 'a' }), animal({ id: 'b', primaryColor: 'black' })];
    expect(match('sheep', '', animals)).toEqual([]);
  });

  it('returns nothing for a whitespace-only colour', () => {
    // `'   '.split(/\s+/)` yields ['', ''], which slips past the word rule.
    expect(match('sheep', '   ', [animal()])).toEqual([]);
  });

  it('returns nothing when there are no registered animals', () => {
    expect(match('sheep', 'white', [])).toEqual([]);
  });

  it('matches a registered colour that is a substring of a single word', () => {
    // "nut" inside "chestnut". Pins today's intentionally-loose behaviour.
    const a = animal({ species: 'horse', primaryColor: 'nut' });
    expect(match('horse', 'chestnut', [a])).toEqual([a]);
  });

  it('returns the same object references it was given', () => {
    // The caller reads `.ownerId` off these to address notification rows, so
    // they must be the real animals, not copies.
    const a = animal();
    const [result] = match('sheep', 'white', [a]);
    expect(result).toBe(a);
  });

  it('returns every matching animal, not just the first', () => {
    const a = animal({ id: 'a', name: 'Dolly' });
    const b = animal({ id: 'b', name: 'Shaun' });
    expect(match('sheep', 'white', [a, b])).toEqual([a, b]);
  });
});

/**
 * Structured markings. These are the rules the free-text box could not have:
 * two people typing "blue tag left ear" and "L ear blue tag #42" produced
 * nothing comparable, so markings were excluded from matching entirely.
 */
describe('matchAnimals with structured markings', () => {
  it('still matches on colour alone when neither side recorded a marking', () => {
    const a = animal();
    expect(match('sheep', 'white', [a])).toEqual([a]);
  });

  it('ranks an animal whose marking was corroborated above one that only shares a colour', () => {
    const tagged = animal({
      id: 'tagged',
      markingDetails: [mark('ear_tag', 'yellow', 'left_ear')],
    });
    const plain = animal({ id: 'plain' });

    // `plain` is listed first to prove the ordering comes from the score and
    // not from the order the database happened to return rows in.
    const result = match('sheep', 'white', [plain, tagged], [
      mark('ear_tag', 'yellow', 'left_ear'),
    ]);
    expect(result.map(a => a.id)).toEqual(['tagged', 'plain']);
  });

  it('scores an exact type + colour + location agreement highest', () => {
    const a = animal({ markingDetails: [mark('ear_tag', 'blue', 'left_ear')] });
    const [result] = rankAnimals(
      { species: 'sheep', primaryColor: 'white', markings: [mark('ear_tag', 'blue', 'left_ear')] },
      [a]
    );
    expect(result.score).toBe(3);
    expect(result.confidence).toBe('strong');
    expect(result.matchedMarkings).toEqual([mark('ear_tag', 'blue', 'left_ear')]);
  });

  it('treats "both ears" as satisfying a left-ear or right-ear claim', () => {
    const a = animal({ markingDetails: [mark('ear_tag', 'blue', 'both_ears')] });
    const [result] = rankAnimals(
      { species: 'sheep', primaryColor: 'white', markings: [mark('ear_tag', 'blue', 'right_ear')] },
      [a]
    );
    expect(result.score).toBe(3);
  });

  it('scores lower, but still matches, when one side did not say where', () => {
    const a = animal({ markingDetails: [mark('ear_tag', 'blue', 'left_ear')] });
    const [result] = rankAnimals(
      // A reporter across a field cannot tell which ear. That must not cost
      // them the match, only some confidence.
      { species: 'sheep', primaryColor: 'white', markings: [mark('ear_tag', 'blue')] },
      [a]
    );
    expect(result.score).toBe(2);
    expect(result.confidence).toBe('likely');
  });

  it('scores lowest when the same marking is reported in a different place', () => {
    const a = animal({ markingDetails: [mark('paint', 'blue', 'back')] });
    const [result] = rankAnimals(
      { species: 'sheep', primaryColor: 'white', markings: [mark('paint', 'blue', 'rump')] },
      [a]
    );
    expect(result.score).toBe(1);
  });

  it('rules out an animal whose marking is contradicted in the same place', () => {
    // A yellow left-ear tag is not a blue left-ear tag. This is the one case
    // where markings are allowed to *remove* a match.
    const a = animal({ markingDetails: [mark('ear_tag', 'blue', 'left_ear')] });
    expect(match('sheep', 'white', [a], [mark('ear_tag', 'yellow', 'left_ear')])).toEqual([]);
  });

  it('does not rule out a contradiction when another marking corroborates', () => {
    const a = animal({
      markingDetails: [mark('ear_tag', 'blue', 'left_ear'), mark('collar', 'red', 'neck')],
    });
    const result = match('sheep', 'white', [a], [
      mark('ear_tag', 'yellow', 'left_ear'),
      mark('collar', 'red', 'neck'),
    ]);
    expect(result).toEqual([a]);
  });

  it('does not rule out a colour clash when either side left the location open', () => {
    // "A blue tag somewhere" and "a yellow tag on the left ear" are not a
    // contradiction — the animal may well have both.
    const a = animal({ markingDetails: [mark('ear_tag', 'blue')] });
    expect(match('sheep', 'white', [a], [mark('ear_tag', 'yellow', 'left_ear')])).toEqual([a]);
  });

  it('does not rule out a different type in the same place', () => {
    const a = animal({ markingDetails: [mark('ear_tag', 'blue', 'left_ear')] });
    expect(match('sheep', 'white', [a], [mark('paint', 'yellow', 'left_ear')])).toEqual([a]);
  });

  it('rescues a match whose registered colour disagrees when the marking is exact', () => {
    // People call the same fleece "white", "cream" and "dirty white". A yellow
    // left-ear tag is not open to interpretation.
    const a = animal({ primaryColor: 'cream' });
    const tagged = animal({ ...a, markingDetails: [mark('ear_tag', 'yellow', 'left_ear')] });

    expect(match('sheep', 'grubby white', [a])).toEqual([]);
    expect(
      match('sheep', 'grubby white', [tagged], [mark('ear_tag', 'yellow', 'left_ear')])
    ).toEqual([tagged]);
  });

  it('does not rescue on a partial marking match alone', () => {
    // Only an exact agreement is strong enough to override the colour gate.
    const a = animal({ primaryColor: 'black', markingDetails: [mark('ear_tag', 'yellow', 'left_ear')] });
    expect(match('sheep', 'white', [a], [mark('ear_tag', 'yellow')])).toEqual([]);
  });

  it('never matches across species, however exact the marking', () => {
    const a = animal({ species: 'goat', markingDetails: [mark('ear_tag', 'blue', 'left_ear')] });
    expect(match('sheep', 'white', [a], [mark('ear_tag', 'blue', 'left_ear')])).toEqual([]);
  });

  it('can match on markings alone when no colour was given', () => {
    // The empty-colour guard exists so a blank field cannot alert every farmer
    // who keeps sheep. A specific marking is not a blank field.
    const a = animal({ markingDetails: [mark('ear_tag', 'blue', 'left_ear')] });
    expect(match('sheep', '', [a], [mark('ear_tag', 'blue', 'left_ear')])).toEqual([a]);
  });

  it('still returns nothing when both the colour and the markings are empty', () => {
    const animals = [animal({ id: 'a' }), animal({ id: 'b', primaryColor: 'black' })];
    expect(match('sheep', '', animals, [])).toEqual([]);
  });

  it('ignores markings the farmer registered but the reporter did not mention', () => {
    // A reporter who missed the collar is the common case; it must not count
    // against them.
    const a = animal({
      markingDetails: [mark('ear_tag', 'blue', 'left_ear'), mark('collar', 'red', 'neck')],
    });
    const [result] = rankAnimals(
      { species: 'sheep', primaryColor: 'white', markings: [mark('ear_tag', 'blue', 'left_ear')] },
      [a]
    );
    expect(result.score).toBe(3);
  });

  it('adds up across several reported markings', () => {
    const a = animal({
      markingDetails: [mark('ear_tag', 'blue', 'left_ear'), mark('paint', 'red', 'rump')],
    });
    const [result] = rankAnimals(
      {
        species: 'sheep',
        primaryColor: 'white',
        markings: [mark('ear_tag', 'blue', 'left_ear'), mark('paint', 'red', 'rump')],
      },
      [a]
    );
    expect(result.score).toBe(6);
  });

  it('reports colour-only matches as possible, not likely', () => {
    const [result] = rankAnimals(
      { species: 'sheep', primaryColor: 'white', markings: [mark('ear_tag', 'blue')] },
      [animal()]
    );
    expect(result.confidence).toBe('possible');
    expect(result.matchedMarkings).toEqual([]);
    expect(result.colorMatched).toBe(true);
  });

  it('returns the same object references it was given', () => {
    // notify.ts reads `.ownerId` off these to address notification rows.
    const a = animal({ markingDetails: [mark('ear_tag', 'blue', 'left_ear')] });
    const [result] = match('sheep', 'white', [a], [mark('ear_tag', 'blue', 'left_ear')]);
    expect(result).toBe(a);
  });
});
