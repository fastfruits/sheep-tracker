'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Megaphone, UserRound, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/', label: 'Report a sighting', icon: Megaphone },
  { href: '/feed', label: 'Community', icon: Users },
  { href: '/account', label: 'Account', icon: UserRound },
];

export function NavLinks({ unread, signedIn }: { unread: number; signedIn: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Main">
      {LINKS.map(link => {
        const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative inline-flex min-h-11 items-center gap-2 rounded-full px-2.5 py-2 text-[13px] max-[359px]:px-2 font-semibold transition-colors sm:px-4 sm:text-sm md:min-h-0',
              active
                ? 'bg-secondary text-brand'
                : 'text-muted-foreground hover:bg-secondary/60 hover:text-brand'
            )}
          >
            {/* Icons only from sm up: below that the three pills already fill a 360px row. */}
            <link.icon className="hidden size-4 sm:block" aria-hidden />
            <span className="hidden sm:inline">{link.label}</span>
            <span className="sm:hidden">{link.label.split(' ')[0]}</span>
            {link.href === '/account' && signedIn && unread > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-extrabold text-destructive-foreground"
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
