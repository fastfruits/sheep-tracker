import type { Metadata } from 'next';
import { getPosts, getCurrentUser } from '@/lib/data/posts';
import { PostCard } from '@/components/post-card';
import {
  CommunityStats, HowItWorksCard, OpenSightingsCard, ProfileCard, ReportPrompt,
} from '@/components/feed-sidebar';

export const metadata: Metadata = {
  title: 'Community',
  description:
    'Recent escaped-animal sightings and photos shared by the SheepFinder community.',
};

// Sightings are time-critical; don't serve a stale cached feed.
export const dynamic = 'force-dynamic';

/**
 * LinkedIn-style three-column layout: profile rail, one post per row in the
 * centre, sightings/stats rail. The rails collapse away below `lg` and the
 * centre column carries the page on its own.
 */
export default async function FeedPage() {
  const [posts, user] = await Promise.all([getPosts(), getCurrentUser()]);
  const open = posts.filter(p => p.isSighting && p.sightingStatus !== 'resolved').length;
  const myPostCount = user ? posts.filter(p => p.userId === user.id).length : 0;

  return (
    <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,19rem)] lg:items-start">
      <aside className="hidden space-y-4 lg:sticky lg:top-22 lg:block">
        <ProfileCard user={user} postCount={myPostCount} />
      </aside>

      <div className="mx-auto w-full max-w-xl space-y-4">
        <header className="flex items-end justify-between gap-3 px-1">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Community</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {open > 0 ? `${open} open sighting${open > 1 ? 's' : ''}` : 'No open sightings'}
            </p>
          </div>
        </header>

        <ReportPrompt user={user} />

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-16 text-center sm:py-24">
            <p className="text-4xl sm:text-5xl" aria-hidden>🌿</p>
            <h2 className="mt-4 text-lg font-bold">Nothing here yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Be the first to share a photo.</p>
          </div>
        ) : (
          posts.map((post, i) => (
            <PostCard key={post.id} post={post} currentUserId={user?.id} priority={i === 0} />
          ))
        )}
      </div>

      {/* Not sticky: three cards can outgrow a laptop viewport. */}
      <aside className="hidden space-y-4 lg:block">
        <OpenSightingsCard posts={posts} />
        <CommunityStats posts={posts} />
        <HowItWorksCard />
      </aside>
    </div>
  );
}
