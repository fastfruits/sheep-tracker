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
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <span aria-hidden className="text-xl">🐑</span>
          <span className="text-lg text-brand">SheepFinder</span>
        </Link>
        <NavLinks unread={unread} signedIn={!!user} />
      </div>
    </header>
  );
}
