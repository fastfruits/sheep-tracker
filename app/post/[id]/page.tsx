import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getPost, getCurrentUser } from '@/lib/data/posts';
import { speciesInfo, speciesLabel, timeAgo } from '@/lib/species';
import { PostPhoto } from '@/components/post-photo';
import { PostActions } from '@/components/post-actions';

export const dynamic = 'force-dynamic';

/**
 * Per-post metadata. This is the reason individual sighting URLs exist: a link
 * pasted into a local Facebook group or WhatsApp thread now unfurls with the
 * animal, the location and the photo instead of generic site boilerplate.
 */
export async function generateMetadata({ params }: PageProps<'/post/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return { title: 'Sighting not found' };

  const label = speciesLabel(post.species);
  const where = post.locationLabel ? ` near ${post.locationLabel}` : '';
  const title = post.isSighting
    ? `Escaped ${label.toLowerCase()}${where}`
    : `${label} spotted${where}`;

  return {
    title,
    description: post.caption,
    openGraph: {
      title,
      description: post.caption,
      type: 'article',
      publishedTime: new Date(post.timestamp).toISOString(),
      images: post.photo ? [{ url: post.photo }] : undefined,
    },
    twitter: {
      card: post.photo ? 'summary_large_image' : 'summary',
      title,
      description: post.caption,
    },
  };
}

export default async function PostPage({ params }: PageProps<'/post/[id]'>) {
  const { id } = await params;
  const [post, user] = await Promise.all([getPost(id), getCurrentUser()]);
  if (!post) notFound();

  const info = speciesInfo(post.species);
  const isEscaped = post.isSighting && post.sightingStatus !== 'resolved';
  const isResolved = post.isSighting && post.sightingStatus === 'resolved';

  return (
    <article className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/feed" className="text-sm font-bold text-brand hover:underline">
        ← Back to community
      </Link>

      <header className="mt-4">
        {isEscaped && (
          <p className="mb-3 inline-block rounded-full bg-escaped-bg px-3 py-1.5 text-sm font-bold text-escaped">
            🚨 Escaped animal — help needed!
          </p>
        )}
        {isResolved && (
          <p className="mb-3 inline-block rounded-full bg-resolved-bg px-3 py-1.5 text-sm font-bold text-resolved">
            ✅ Reunited with owner
          </p>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {post.isSighting ? `Escaped ${speciesLabel(post.species).toLowerCase()}` : speciesLabel(post.species)}
          {post.locationLabel ? ` near ${post.locationLabel}` : ''}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Reported by{' '}
          <Link href={`/u/${post.userId}`} className="font-semibold text-foreground hover:underline">
            {post.userName}
          </Link>{' '}
          ·{' '}
          <time dateTime={new Date(post.timestamp).toISOString()}>{timeAgo(post.timestamp)}</time>
        </p>
      </header>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border">
        <PostPhoto
          src={post.photo}
          alt={post.caption || 'Reported animal'}
          emoji={info?.emoji ?? '🐾'}
          priority
        />
      </div>

      <p className="mt-5 text-base leading-relaxed sm:text-lg">{post.caption}</p>

      <dl className="mt-5 grid grid-cols-1 gap-y-0.5 rounded-xl bg-card p-4 text-sm ring-1 ring-border sm:grid-cols-[auto_1fr] sm:gap-x-6 sm:gap-y-2">
        {info && (
          <>
            <dt className="mt-2 font-semibold text-muted-foreground first:mt-0 sm:mt-0">Animal</dt>
            <dd className="break-words">{info.emoji} {info.label}</dd>
          </>
        )}
        {post.primaryColor && (
          <>
            <dt className="mt-2 font-semibold text-muted-foreground first:mt-0 sm:mt-0">color</dt>
            <dd className="break-words">{post.primaryColor}</dd>
          </>
        )}
        {post.markings && (
          <>
            <dt className="mt-2 font-semibold text-muted-foreground first:mt-0 sm:mt-0">Markings</dt>
            <dd className="break-words">{post.markings}</dd>
          </>
        )}
        {post.locationLabel && (
          <>
            <dt className="mt-2 font-semibold text-muted-foreground first:mt-0 sm:mt-0">Location</dt>
            <dd className="break-words">📍 {post.locationLabel}</dd>
          </>
        )}
        {post.latitude != null && post.longitude != null && (
          <>
            <dt className="mt-2 font-semibold text-muted-foreground first:mt-0 sm:mt-0">Coordinates</dt>
            <dd className="break-words">
              <a
                className="font-mono text-brand hover:underline"
                href={`https://www.google.com/maps/search/?api=1&query=${post.latitude},${post.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {post.latitude.toFixed(5)}, {post.longitude.toFixed(5)}
              </a>
            </dd>
          </>
        )}
      </dl>

      <div className="mt-6">
        <PostActions
          postId={post.id}
          liked={!!user && post.likes.includes(user.id)}
          likeCount={post.likes.length}
          confirmed={!!user && post.confirmations.includes(user.id)}
          confirmCount={post.confirmations.length}
          commentCount={post.comments.length}
          isSighting={post.isSighting}
          isAuthor={post.userId === user?.id}
          resolved={post.sightingStatus === 'resolved'}
          signedIn={!!user}
          showComposer
        />
      </div>

      {post.comments.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-bold sm:text-lg">Comments</h2>
          <ul className="mt-3 space-y-3">
            {post.comments.map(c => (
              <li key={c.id} className="rounded-xl bg-card p-3 text-sm ring-1 ring-border">
                <span className="font-bold">{c.userName}</span>{' '}
                <time className="text-xs text-muted-foreground" dateTime={new Date(c.timestamp).toISOString()}>
                  {timeAgo(c.timestamp)}
                </time>
                <p className="mt-1">{c.text}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
