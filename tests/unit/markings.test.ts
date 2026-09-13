import { describe, expect, it } from 'vitest';
import {
  MARKING_COLORS, MARKING_LOCATIONS, MARKING_TYPES, MAX_MARKINGS,
  describeMarking, formatMarkings, parseMarkings, type Marking,
} from '@/lib/markings';

/**
 * The vocabulary and its guards. `parseMarkings` is the trust boundary: it runs
 * on JSON posted by the browser and on `jsonb` read back from the database, so
 * everything below is untrusted input by the time it gets here.
 */

function mark(
  type: Marking['type'],
  color: Marking['color'],
  location: Marking['location'] = 'unknown'
): Marking {
  return { type, color, location };
}

describe('vocabulary', () => {
  it('has no duplicate values in any list', () => {
    for (const list of [MARKING_TYPES, MARKING_COLORS, MARKING_LOCATIONS]) {
      const values = list.map(entry => entry.value);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('offers "Not sure" as the first location', () => {
    // It is the default in the picker; a reporter must never be pushed into
    // guessing a side, because a wrong guess reads as a disqualifying conflict.
    expect(MARKING_LOCATIONS[0].value).toBe('unknown');
  });
});

describe('describeMarking', () => {
  it('reads as plain English', () => {
    expect(describeMarking(mark('ear_tag', 'blue', 'left_ear'))).toBe('blue ear tag on left ear');
  });

  it('omits the location when it was not given', () => {
    expect(describeMarking(mark('collar', 'red'))).toBe('red collar');
  });

  it('omits the colour word for "other"', () => {
    expect(describeMarking(mark('brand', 'other', 'rump'))).toBe('brand on rump / tail');
  });
});

describe('formatMarkings', () => {
  it('joins markings into the summary written to the legacy text column', () => {
    expect(formatMarkings([mark('ear_tag', 'blue', 'left_ear'), mark('paint', 'red', 'rump')]))
      .toBe('Blue ear tag on left ear, red spray paint on rump / tail');
  });

  it('appends the free-text note last', () => {
    expect(formatMarkings([mark('collar', 'red')], 'torn left ear'))
      .toBe('Red collar, torn left ear');
  });

  it('returns an empty string when there is nothing to say', () => {
    // The callers write `|| null`, so this must be falsy rather than ', '.
    expect(formatMarkings([], '   ')).toBe('');
  });
});

describe('parseMarkings', () => {
  it('accepts a JSON string, which is what the report form posts', () => {
    expect(parseMarkings(JSON.stringify([mark('ear_tag', 'blue', 'left_ear')])))
      .toEqual([mark('ear_tag', 'blue', 'left_ear')]);
  });

  it('accepts an array, which is what jsonb reads back as', () => {
    expect(parseMarkings([mark('collar', 'red', 'neck')])).toEqual([mark('collar', 'red', 'neck')]);
  });

  it('returns [] for null, undefined and legacy free text', () => {
    // Every animal registered before this change has null in the jsonb column
    // and prose in the text one. Both must degrade to "no structured markings"
    // so the colour rule decides, exactly as it did before.
    expect(parseMarkings(null)).toEqual([]);
    expect(parseMarkings(undefined)).toEqual([]);
    expect(parseMarkings('blue paint on back')).toEqual([]);
    expect(parseMarkings('')).toEqual([]);
    expect(parseMarkings({ type: 'ear_tag' })).toEqual([]);
  });

  it('drops entries outside the vocabulary rather than repairing them', () => {
    // A junk value that survived would be unmatchable forever — the exact
    // failure the free-text box had.
    expect(parseMarkings([
      { type: 'laser_tag', color: 'blue', location: 'left_ear' },
      { type: 'ear_tag', color: 'chartreuse', location: 'left_ear' },
      { type: 'ear_tag', color: 'blue', location: 'left_ear' },
    ])).toEqual([mark('ear_tag', 'blue', 'left_ear')]);
  });

  it('falls back to "unknown" for an unrecognised location', () => {
    // The location is optional, so a bad one degrades the entry instead of
    // discarding a marking the user really did see.
    expect(parseMarkings([{ type: 'ear_tag', color: 'blue', location: 'left_hoof' }]))
      .toEqual([mark('ear_tag', 'blue')]);
  });

  it('drops duplicates, which multiply the scoring loop but add no signal', () => {
    expect(parseMarkings([mark('ear_tag', 'blue'), mark('ear_tag', 'blue')]))
      .toEqual([mark('ear_tag', 'blue')]);
  });

  it('caps the list at MAX_MARKINGS', () => {
    const many = MARKING_COLORS.slice(0, MAX_MARKINGS + 3).map(c => mark('ear_tag', c.value));
    expect(parseMarkings(many)).toHaveLength(MAX_MARKINGS);
  });

  it('ignores non-object entries and malformed JSON', () => {
    expect(parseMarkings([null, 'blue', 42, mark('bell', 'yellow')])).toEqual([mark('bell', 'yellow')]);
    expect(parseMarkings('{not json')).toEqual([]);
  });
});
