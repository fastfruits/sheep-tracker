import { describeMarking, markingColorInfo, type Marking } from '@/lib/markings';
import { cn } from '@/lib/utils';

/**
 * Read-only chips for a set of structured markings.
 *
 * No `'use client'` on purpose — it renders in the server-rendered post page
 * and inside the client-side feed card alike.
 */
export function MarkingList({ markings, className }: { markings: Marking[]; className?: string }) {
  if (markings.length === 0) return null;

  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)}>
      {markings.map(m => (
        <li
          key={`${m.type}-${m.color}-${m.location}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs font-semibold ring-1 ring-border"
        >
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full ring-1 ring-border"
            style={{ backgroundColor: markingColorInfo(m.color)?.swatch }}
          />
          {describeMarking(m)}
        </li>
      ))}
    </ul>
  );
}
