/**
 * Structured distinguishing markings.
 *
 * This replaces the free-text "Distinguishing markings" box that both
 * reporters and farmers used to fill in. Two people describing the same animal
 * wrote "blue tag left ear", "L ear blue tag #42" and "blue eartag" — all
 * correct, none comparable — so the marking a farmer registered could never be
 * matched against the marking a reporter typed. Matching therefore ignored
 * markings entirely and ran on species + primary colour alone.
 *
 * Everything here is a closed vocabulary so both sides of a match pick from the
 * same list. The free-text field survives as `markingNotes`, for the genuinely
 * odd ("torn left ear"), and is deliberately NOT used for matching.
 */

export type MarkingType =
  | 'ear_tag' | 'paint' | 'collar' | 'horn_tag' | 'leg_band'
  | 'brand' | 'halter' | 'bell' | 'patch' | 'other';

export type MarkingColor =
  | 'black' | 'white' | 'grey' | 'brown' | 'tan' | 'red' | 'orange'
  | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'other';

export type MarkingLocation =
  | 'left_ear' | 'right_ear' | 'both_ears' | 'head' | 'neck' | 'shoulder'
  | 'back' | 'side' | 'rump' | 'legs' | 'horns' | 'unknown';

export interface Marking {
  type: MarkingType;
  color: MarkingColor;
  /** `unknown` is a first-class answer: a reporter 50m away often cannot tell. */
  location: MarkingLocation;
}

/**
 * A sighting or animal may carry several. Capped so one entry cannot balloon
 * the JSON column or the match loop, which is O(reported × registered).
 */
export const MAX_MARKINGS = 6;

export const MARKING_TYPES: { value: MarkingType; label: string; emoji: string }[] = [
  { value: 'ear_tag',  label: 'Ear tag',    emoji: '🏷️' },
  { value: 'paint',    label: 'Spray paint', emoji: '🎨' },
  { value: 'collar',   label: 'Collar',     emoji: '⭕' },
  { value: 'horn_tag', label: 'Horn tag',   emoji: '🐏' },
  { value: 'leg_band', label: 'Leg band',   emoji: '🦵' },
  { value: 'brand',    label: 'Brand',      emoji: '🔥' },
  { value: 'halter',   label: 'Halter',     emoji: '🪢' },
  { value: 'bell',     label: 'Bell',       emoji: '🔔' },
  { value: 'patch',    label: 'Patch',      emoji: '🐾' },
  { value: 'other',    label: 'Other',      emoji: '❓' },
];

/** `swatch` is a plain CSS colour for the picker dots — not a theme token. */
export const MARKING_COLORS: { value: MarkingColor; label: string; swatch: string }[] = [
  { value: 'black',  label: 'Black',  swatch: '#1c1917' },
  { value: 'white',  label: 'White',  swatch: '#fafaf9' },
  { value: 'grey',   label: 'Grey',   swatch: '#a1a1aa' },
  { value: 'brown',  label: 'Brown',  swatch: '#78350f' },
  { value: 'tan',    label: 'Tan',    swatch: '#d6b483' },
  { value: 'red',    label: 'Red',    swatch: '#dc2626' },
  { value: 'orange', label: 'Orange', swatch: '#ea580c' },
  { value: 'yellow', label: 'Yellow', swatch: '#eab308' },
  { value: 'green',  label: 'Green',  swatch: '#16a34a' },
  { value: 'blue',   label: 'Blue',   swatch: '#2563eb' },
  { value: 'purple', label: 'Purple', swatch: '#7c3aed' },
  { value: 'pink',   label: 'Pink',   swatch: '#ec4899' },
  { value: 'other',  label: 'Other',  swatch: 'transparent' },
];

export const MARKING_LOCATIONS: { value: MarkingLocation; label: string }[] = [
  { value: 'unknown',    label: "Not sure" },
  { value: 'left_ear',   label: 'Left ear' },
  { value: 'right_ear',  label: 'Right ear' },
  { value: 'both_ears',  label: 'Both ears' },
  { value: 'head',       label: 'Head / face' },
  { value: 'neck',       label: 'Neck' },
  { value: 'shoulder',   label: 'Shoulder' },
  { value: 'back',       label: 'Back' },
  { value: 'side',       label: 'Side' },
  { value: 'rump',       label: 'Rump / tail' },
  { value: 'legs',       label: 'Legs' },
  { value: 'horns',      label: 'Horns' },
];

const TYPE_LABELS = new Map(MARKING_TYPES.map(t => [t.value, t.label]));
const COLOR_LABELS = new Map(MARKING_COLORS.map(c => [c.value, c.label]));
const LOCATION_LABELS = new Map(MARKING_LOCATIONS.map(l => [l.value, l.label]));

export function markingTypeInfo(value: MarkingType) {
  return MARKING_TYPES.find(t => t.value === value);
}

export function markingColorInfo(value: MarkingColor) {
  return MARKING_COLORS.find(c => c.value === value);
}

/**
 * "Blue ear tag on left ear". Used for the legacy `markings` text column, for
 * screen readers, and anywhere a plain string beats a row of chips.
 */
export function describeMarking(m: Marking): string {
  const color = COLOR_LABELS.get(m.color) ?? m.color;
  const type = (TYPE_LABELS.get(m.type) ?? m.type).toLowerCase();
  const head = m.color === 'other' ? type : `${color.toLowerCase()} ${type}`;
  if (m.location === 'unknown') return head;
  return `${head} on ${(LOCATION_LABELS.get(m.location) ?? m.location).toLowerCase()}`;
}

/**
 * Human-readable summary of a whole set. Written to the existing `markings`
 * text column alongside the JSON, so every reader that predates this change —
 * old feed rows, the post page, the farmer's animal list — keeps working
 * without a backfill.
 */
export function formatMarkings(markings: Marking[], notes?: string | null): string {
  const parts = markings.map(describeMarking);
  const trimmedNotes = notes?.trim();
  if (trimmedNotes) parts.push(trimmedNotes);
  if (parts.length === 0) return '';
  const joined = parts.join(', ');
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

const TYPE_VALUES = new Set<string>(MARKING_TYPES.map(t => t.value));
const COLOR_VALUES = new Set<string>(MARKING_COLORS.map(c => c.value));
const LOCATION_VALUES = new Set<string>(MARKING_LOCATIONS.map(l => l.value));

/**
 * Coerce untrusted input — a JSON string posted by the browser, or a `jsonb`
 * column written by an older build — into valid markings.
 *
 * Anything outside the vocabulary is dropped rather than repaired. A junk value
 * that survived this would be silently unmatchable forever, which is exactly
 * the failure mode free text had.
 */
export function parseMarkings(value: unknown): Marking[] {
  let raw = value;
  if (typeof raw === 'string') {
    if (!raw.trim()) return [];
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];

  const out: Marking[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const { type, color, location } = entry as Record<string, unknown>;
    if (typeof type !== 'string' || !TYPE_VALUES.has(type)) continue;
    if (typeof color !== 'string' || !COLOR_VALUES.has(color)) continue;
    const loc = typeof location === 'string' && LOCATION_VALUES.has(location)
      ? (location as MarkingLocation)
      : 'unknown';

    const marking: Marking = {
      type: type as MarkingType,
      color: color as MarkingColor,
      location: loc,
    };
    // Duplicates add nothing to a match but multiply the scoring loop.
    if (out.some(m => m.type === marking.type && m.color === marking.color && m.location === marking.location)) {
      continue;
    }
    out.push(marking);
    if (out.length >= MAX_MARKINGS) break;
  }
  return out;
}
