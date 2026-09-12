import Link from 'next/link';
import { getCurrentUser, getNotifications } from '@/lib/data/posts';
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
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-2 font-extrabold tracking-tight md:min-h-0">
          <span aria-hidden className="text-lg sm:text-xl">🐑</span>
          {/* Below 360px the wordmark plus three nav pills overflow the row;
            the emoji alone still reads as the logo. */}
          <span className="text-base text-brand max-[359px]:hidden sm:text-lg">SheepFinder</span>
        </Link>
        <NavLinks unread={unread} signedIn={!!user} />
      </div>
    </header>
  );
}
