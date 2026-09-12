import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  getCurrentUser, getAnimalsByOwner, getNotifications, getPostsByUser, getFollowCounts,
} from '@/lib/data/posts';

import { logout } from '@/app/actions/auth';
import { AnimalManager } from '@/components/animal-manager';
import { AlertList } from '@/components/alert-list';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Account',
  description: 'Manage your SheepFinder profile, registered animals and sighting alerts.',
};

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [animals, notifications, posts, counts] = await Promise.all([
    user.isFarmer ? getAnimalsByOwner(user.id) : Promise.resolve([]),
    user.isFarmer ? getNotifications(user.id) : Promise.resolve([]),
    getPostsByUser(user.id),
    getFollowCounts(user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{user.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          {user.isFarmer && (
            <p className="mt-2 inline-block rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-brand">
              🌾 {user.farmName ?? 'Farmer'}
            </p>
          )}
        </div>
        <form action={logout}>
          <Button variant="outline" size="sm" type="submit">Log out</Button>
        </form>
      </header>

      <dl className="mt-6 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-3 text-center sm:gap-3 sm:p-4">
        <div>
          <dd className="text-lg font-extrabold sm:text-xl">{posts.length}</dd>
          <dt className="text-xs text-muted-foreground">Posts</dt>
        </div>
        <div className="border-x border-border">
          <dd className="text-lg font-extrabold sm:text-xl">{counts.followers}</dd>
          <dt className="text-xs text-muted-foreground">Followers</dt>
        </div>
        <div>
          <dd className="text-lg font-extrabold sm:text-xl">{counts.following}</dd>
          <dt className="text-xs text-muted-foreground">Following</dt>
        </div>
      </dl>

      <p className="mt-4 text-center text-sm">
        <Link href={`/u/${user.id}`} className="font-bold text-brand hover:underline">
          View your public profile →
        </Link>
      </p>

      {user.isFarmer && (
        <>
          <section className="mt-8 sm:mt-10">
            <h2 className="text-lg font-extrabold sm:text-xl">Sighting alerts</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Raised automatically when a report matches one of your animals.
            </p>
            <AlertList notifications={notifications} />
          </section>

          <section className="mt-8 sm:mt-10">
            <h2 className="text-lg font-extrabold sm:text-xl">Your animals</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Only you can see this list. It is matched against every new sighting.
            </p>
            <AnimalManager animals={animals} />
          </section>
        </>
      )}

      {!user.isFarmer && (
        <section className="mt-8 rounded-2xl border border-amber-note-border bg-amber-note-bg p-4 sm:mt-10 sm:p-5">
          <h2 className="font-extrabold">Are you a farmer?</h2>
          <p className="mt-1 text-sm">
            Farmer accounts can register animals and get alerted when someone reports
            a match. Contact us to upgrade your account.
          </p>
        </section>
      )}
    </div>
  );
}
