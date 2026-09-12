import type { Metadata } from 'next';
import { getPosts, getCurrentUser } from '@/lib/data/posts';
import { PostCard } from '@/components/post-card';

export const metadata: Metadata = {
  title: 'Community',
  description:
    'Recent escaped-animal sightings and photos shared by the SheepFinder community.',
};

// Sightings are time-critical; don't serve a stale cached feed.
export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  const [posts, user] = await Promise.all([getPosts(), getCurrentUser()]);
  const open = posts.filter(p => p.isSighting && p.sightingStatus !== 'resolved').length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Community</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {open > 0 ? `${open} open sighting${open > 1 ? 's' : ''}` : 'No open sightings'}
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="py-16 text-center sm:py-24">
          <p className="text-4xl sm:text-5xl" aria-hidden>🌿</p>
          <h2 className="mt-4 text-lg font-bold">Nothing here yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Be the first to share a photo.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          {posts.map(post => (
            <PostCard key={post.id} post={post} currentUserId={user?.id} />
          ))}
        </div>
      )}
    </div>
  );
}
