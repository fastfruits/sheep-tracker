'use client';

import { useState } from 'react';

import {
  MARKING_COLORS, MARKING_LOCATIONS, MARKING_TYPES, MAX_MARKINGS,
  describeMarking, markingColorInfo, markingTypeInfo,
  type Marking, type MarkingColor, type MarkingLocation, type MarkingType,
} from '@/lib/markings';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Builds a list of structured markings: what it is, what colour it is, where
 * it is. Shared by the sighting report, farmer sign-up and the account page so
 * a reporter and a farmer are literally choosing from the same lists — which
 * is what makes lib/matching.ts able to compare them.
 *
 * Location is optional and defaults to "Not sure": a reporter looking at a
 * sheep from across a field genuinely cannot tell which ear, and forcing a
 * guess would manufacture the conflicts matching treats as disqualifying.
 */
export function MarkingPicker({
  markings,
  onChange,
  label = 'Distinguishing markings',
  description,
}: {
  markings: Marking[];
  onChange: (markings: Marking[]) => void;
  label?: string;
  description?: string;
}) {
  const [type, setType] = useState<MarkingType | ''>('');
  const [color, setColor] = useState<MarkingColor | ''>('');
  const [location, setLocation] = useState<MarkingLocation>('unknown');
  const [error, setError] = useState<string | null>(null);

  const full = markings.length >= MAX_MARKINGS;

  function add() {
    if (!type) { setError('Pick what the marking is.'); return; }
    if (!color) { setError('Pick the colour of the marking.'); return; }

    const next: Marking = { type, color, location };
    if (markings.some(m => m.type === next.type && m.color === next.color && m.location === next.location)) {
      setError("You've already added that one.");
      return;
    }

    onChange([...markings, next]);
    setType(''); setColor(''); setLocation('unknown'); setError(null);
  }

  return (
    <fieldset>
      <legend className="mb-1 text-sm font-bold">{label}</legend>
      <p className="mb-3 text-sm text-muted-foreground">
        {description ??
          'Pick from the lists so we can match this against what farmers registered.'}
      </p>

      {markings.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {markings.map((m, i) => (
            <li
              key={`${m.type}-${m.color}-${m.location}`}
              className="inline-flex items-center gap-2 rounded-full border-2 border-brand/40 bg-secondary py-1.5 pl-3 pr-1.5 text-sm font-semibold"
            >
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full ring-1 ring-border"
                style={{ backgroundColor: markingColorInfo(m.color)?.swatch }}
              />
              <span>{describeMarking(m)}</span>
              <button
                type="button"
                onClick={() => onChange(markings.filter((_, j) => j !== i))}
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-destructive"
                aria-label={`Remove ${describeMarking(m)}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {full ? (
        <p className="rounded-xl border border-border bg-muted p-3 text-sm text-muted-foreground">
          That&apos;s {MAX_MARKINGS} markings — plenty to match on. Remove one to
          swap it for another.
        </p>
      ) : (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
          <div>
            <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
              Tag or marking
            </Label>
            <div className="flex flex-wrap gap-2">
              {MARKING_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => { setType(t.value); setError(null); }}
                  aria-pressed={type === t.value}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-1 rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition-colors md:min-h-0',
                    type === t.value
                      ? 'border-brand bg-brand text-white'
                      : 'border-border bg-background hover:border-brand/40'
                  )}
                >
                  <span aria-hidden>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
              Colour of the {type ? markingTypeInfo(type)?.label.toLowerCase() : 'marking'}
            </Label>
            <div className="flex flex-wrap gap-2">
              {MARKING_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => { setColor(c.value); setError(null); }}
                  aria-pressed={color === c.value}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition-colors md:min-h-0',
                    color === c.value
                      ? 'border-brand bg-brand text-white'
                      : 'border-border bg-background hover:border-brand/40'
                  )}
                >
                  <span
                    aria-hidden
                    className="size-3.5 shrink-0 rounded-full ring-1 ring-border"
                    style={{ backgroundColor: c.swatch }}
                  />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label
              htmlFor="marking-location"
              className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground"
            >
              Where on the animal
            </Label>
            <select
              id="marking-location"
              value={location}
              onChange={e => setLocation(e.target.value as MarkingLocation)}
              className="h-11 w-full rounded-xl border-2 border-border bg-background px-3 text-sm font-semibold outline-none focus-visible:border-brand"
            >
              {MARKING_LOCATIONS.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm font-semibold text-destructive">{error}</p>}

          <Button type="button" variant="outline" className="w-full" onClick={add}>
            + Add marking
          </Button>
        </div>
      )}
    </fieldset>
  );
}
