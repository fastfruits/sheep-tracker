import Link from 'next/link';
import { getCurrentUser, getNotifications } from '@/lib/data/posts';
import { DisplayMenu } from './display-menu';
import { NavLinks } from './nav-links';

/**
 * Server component so the unread badge is correct in the first paint rather
 * than popping in after a client fetch.
 */
export async function SiteNav() {
  const user = await getCurrentUser();

  let unread = 0;
  if (user?.isFarmer) {
    const notifications = await getNotifications(user.id);
    unread = notifications.filter(n => !n.read).length;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 max-[359px]:px-3 sm:h-16 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-2 font-extrabold tracking-tight md:min-h-0">
          <span aria-hidden className="text-lg sm:text-xl">🐑</span>
          {/* Below 440px the wordmark plus three nav pills and the display
            menu overflow the row; the emoji alone still reads as the logo. */}
          <span className="text-base text-brand max-[439px]:hidden sm:text-lg">SheepFinder</span>
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-2">
          <NavLinks unread={unread} signedIn={!!user} />
          <DisplayMenu />
        </div>
      </div>
    </header>
  );
}
