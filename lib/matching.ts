import type { RegisteredAnimal, Species } from './types';

export interface SightingDescription {
  species: Species;
  primaryColor: string;
}

/**
 * Decide which registered animals a sighting might be.
 *
 * Ported verbatim from `submitSighting` in the React Native build so behavior
 * is unchanged: same species, and colors that overlap in either direction or
 * share a word longer than two characters ("black and white" matches "white").
 *
 * This used to run in the browser over every animal in the database, which is
 * why `animals` needed a public read policy. It now runs server-side inside the
 * report action, so that policy can be restricted to the owner.
 */
export function matchAnimals(
  sighting: SightingDescription,
  animals: RegisteredAnimal[]
): RegisteredAnimal[] {
  const reported = (sighting.primaryColor || '').toLowerCase();

  return animals.filter(animal => {
    if (animal.species !== sighting.species) return false;
    const registered = animal.primaryColor.toLowerCase();
    return (
      reported.includes(registered) ||
      registered.includes(reported) ||
      reported.split(/\s+/).some(word => word.length > 2 && registered.includes(word))
    );
  });
}
