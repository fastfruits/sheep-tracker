import { describe, expect, it } from 'vitest';
import { matchAnimals } from '@/lib/matching';
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
    ...overrides,
  };
}

function match(species: Species, primaryColor: string, animals: RegisteredAnimal[]) {
  return matchAnimals({ species, primaryColor }, animals);
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
