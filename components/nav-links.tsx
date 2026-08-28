'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/', label: 'Report a sighting' },
  { href: '/feed', label: 'Community' },
  { href: '/account', label: 'Account' },
];

export function NavLinks({ unread, signedIn }: { unread: number; signedIn: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1" aria-label="Main">
      {LINKS.map(link => {
        const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:px-4',
              active
                ? 'bg-secondary text-brand'
                : 'text-muted-foreground hover:bg-secondary/60 hover:text-brand'
            )}
          >
            <span className="hidden sm:inline">{link.label}</span>
            <span className="sm:hidden">{link.label.split(' ')[0]}</span>
            {link.href === '/account' && signedIn && unread > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-extrabold text-white"
                aria-label={`${unread} unread alerts`}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
