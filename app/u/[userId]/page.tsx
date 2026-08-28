import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  getProfile, getPostsByUser, getFollowCounts, getCurrentUser, isFollowing,
} from '@/lib/data/posts';
import { speciesInfo } from '@/lib/species';
import { PostPhoto } from '@/components/post-photo';
import { FollowButton } from '@/components/follow-button';

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

function initialColor(str: string) {
  const colors = ['#2E7D32', '#1565C0', '#6A1B9A', '#AD1457', '#00695C', '#E65100'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/feed" className="text-sm font-bold text-brand hover:underline">
        ← Back to community
      </Link>

      <header className="mt-6 flex flex-col items-center text-center">
        <span
          className="grid size-20 place-items-center rounded-full text-2xl font-extrabold text-white"
          style={{ backgroundColor: initialColor(user.name) }}
          aria-hidden
        >
          {user.name.charAt(0).toUpperCase()}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{user.name}</h1>
        {user.isFarmer && (
          <p className="mt-2 rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-brand">
            🌾 {user.farmName ?? 'Farmer'}
          </p>
        )}

        <dl className="mt-5 flex items-center gap-8 text-center">
          <div>
            <dt className="sr-only">Posts</dt>
            <dd className="text-xl font-extrabold">{posts.length}</dd>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div>
            <dt className="sr-only">Followers</dt>
            <dd className="text-xl font-extrabold">{counts.followers}</dd>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div>
            <dt className="sr-only">Following</dt>
            <dd className="text-xl font-extrabold">{counts.following}</dd>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </dl>

        {me && me.id !== userId && (
          <FollowButton targetId={userId} following={following} className="mt-5" />
        )}
      </header>

      <section className="mt-10">
        <h2 className="sr-only">Posts</h2>
        {posts.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">Nothing shared here yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {posts.map(post => {
              const info = speciesInfo(post.species);
              const escaped = post.isSighting && post.sightingStatus !== 'resolved';
              return (
                <li key={post.id} className="relative overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg">
                  <Link href={`/post/${post.id}`}>
                    <PostPhoto src={post.photo} alt={post.caption} emoji={info?.emoji ?? '🐾'} />
                    <span
                      className={`absolute left-2 top-2 size-2.5 rounded-full ${escaped ? 'bg-escaped' : 'bg-resolved'}`}
                      aria-label={escaped ? 'Open sighting' : 'Resolved'}
                    />
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
