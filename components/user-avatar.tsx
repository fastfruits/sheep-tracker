import { cn } from '@/lib/utils';

const COLORS = ['#2E7D32', '#1565C0', '#6A1B9A', '#AD1457', '#00695C', '#E65100'];

/** Stable per-name color so the same person always gets the same avatar. */
export function initialColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

/** Initial-letter avatar. Size and text size come from `className`. */
export function UserAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn('grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white', className)}
      style={{ backgroundColor: initialColor(name) }}
      aria-hidden
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
