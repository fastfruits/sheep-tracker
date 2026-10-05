import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, TriangleAlert } from 'lucide-react';

import {
  getProfile, getPostsByUser, getFollowCounts, getCurrentUser, isFollowing,
} from '@/lib/data/posts';
import { speciesInfo } from '@/lib/species';
import { PostPhoto } from '@/components/post-photo';
import { FollowButton } from '@/components/follow-button';
import { UserAvatar } from '@/components/user-avatar';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/u/[userId]'>): Promise<Metadata> {
  const { userId } = await params;
  const user = await getProfile(userId);
  if (!user) return { title: 'Profile not found' };

  return {
    title: user.name,
    description: user.isFarmer
      ? `${user.name}${user.farmName ? ` of ${user.farmName}` : ''} on SheepFinder.`
      : `${user.name}'s sightings on SheepFinder.`,
  };
}

export default async function ProfilePage({ params }: PageProps<'/u/[userId]'>) {
  const { userId } = await params;
  const user = await getProfile(userId);
  if (!user) notFound();

  const [posts, counts, me] = await Promise.all([
    getPostsByUser(userId),
    getFollowCounts(userId),
    getCurrentUser(),
  ]);
  const following = me ? await isFollowing(me.id, userId) : false;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/feed" className="text-sm font-bold text-brand hover:underline">
        ← Back to community
      </Link>

      <header className="mt-6 flex flex-col items-center text-center">
        <UserAvatar name={user.name} className="size-16 text-xl font-extrabold sm:size-20 sm:text-2xl" />
        <h1 className="mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">{user.name}</h1>
        {user.isFarmer && (
          <p className="mt-2 rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-brand">
            🌾 {user.farmName ?? 'Farmer'}
          </p>
        )}

        <dl className="mt-5 flex items-center gap-6 text-center sm:gap-8">
          <div>
            <dt className="sr-only">Posts</dt>
            <dd className="text-lg font-extrabold sm:text-xl">{posts.length}</dd>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div>
            <dt className="sr-only">Followers</dt>
            <dd className="text-lg font-extrabold sm:text-xl">{counts.followers}</dd>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div>
            <dt className="sr-only">Following</dt>
            <dd className="text-lg font-extrabold sm:text-xl">{counts.following}</dd>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </dl>

        {me && me.id !== userId && (
          <FollowButton targetId={userId} following={following} className="mt-5" />
        )}
      </header>

      <section className="mt-8 sm:mt-10">
        <h2 className="sr-only">Posts</h2>
        {posts.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">Nothing shared here yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {posts.map(post => {
              const info = speciesInfo(post.species);
              const escaped = post.isSighting && post.sightingStatus !== 'resolved';
              return (
                <li key={post.id} className="relative overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg">
                  <Link href={`/post/${post.id}`}>
                    <PostPhoto
                      src={post.photo}
                      alt={post.caption}
                      emoji={info?.emoji ?? '🐾'}
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                    {/* Icon shape, not just color, tells the states apart (WCAG 1.4.1). */}
                    {post.isSighting && (
                      <span
                        className={`absolute left-2 top-2 grid size-6 place-items-center rounded-full border-2 border-card ${escaped ? 'bg-escaped' : 'bg-resolved'}`}
                        role="img"
                        aria-label={escaped ? 'Open sighting' : 'Resolved'}
                      >
                        {escaped
                          ? <TriangleAlert className="size-3.5 text-card" strokeWidth={2.75} aria-hidden />
                          : <Check className="size-3.5 text-card" strokeWidth={3} aria-hidden />}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
