import Image from 'next/image';
import { cn } from '@/lib/utils';

const COLORS = ['#2E7D32', '#1565C0', '#6A1B9A', '#AD1457', '#00695C', '#E65100'];

/** Stable per-name color so the same person always gets the same avatar. */
export function initialColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

/**
 * Profile picture, or an initial-letter avatar when there isn't one. Size and
 * text size come from `className`. Decorative: the name is always rendered
 * next to it.
 */
export function UserAvatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  return (
    <span
      className={cn(
        'relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-bold text-white',
        className
      )}
      style={src ? undefined : { backgroundColor: initialColor(name) }}
      aria-hidden
    >
      {src ? (
        <Image src={src} alt="" fill sizes="96px" className="object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}
