import type { Species } from './types';

/** Ported verbatim from store/app-store.tsx. */
export const SPECIES_LIST: { value: Species; label: string; emoji: string }[] = [
  { value: 'sheep',   label: 'Sheep',   emoji: '🐑' },
  { value: 'cow',     label: 'Cow',     emoji: '🐄' },
  { value: 'goat',    label: 'Goat',    emoji: '🐐' },
  { value: 'pig',     label: 'Pig',     emoji: '🐷' },
  { value: 'horse',   label: 'Horse',   emoji: '🐴' },
  { value: 'dog',     label: 'Dog',     emoji: '🐕' },
  { value: 'cat',     label: 'Cat',     emoji: '🐈' },
  { value: 'chicken', label: 'Chicken', emoji: '🐔' },
  { value: 'other',   label: 'Other',   emoji: '🐾' },
];

export function speciesInfo(value?: string) {
  return SPECIES_LIST.find(s => s.value === value);
}

export function speciesLabel(value?: string) {
  return speciesInfo(value)?.label ?? value ?? 'Animal';
}

export function timeAgo(timestamp: number): string {
  const s = Math.floor((Date.now() - timestamp) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
