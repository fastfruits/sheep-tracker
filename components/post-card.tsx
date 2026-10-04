import Link from 'next/link';
import { PostPhoto } from './post-photo';
import { PostActions } from './post-actions';
import { MarkingList } from './marking-list';
import { speciesInfo, timeAgo } from '@/lib/species';
import type { Post } from '@/lib/types';
import { UserAvatar } from './user-avatar';
import { cn } from '@/lib/utils';

/**
 * Server-rendered so the caption, species and location are in the HTML that
 * crawlers and link-preview bots see. Interactive controls (like, confirm,
 * comment) are separate client islands.
 */
export function PostCard({
  post, currentUserId, priority,
}: { post: Post; currentUserId?: string; priority?: boolean }) {
  const info = speciesInfo(post.species);
  const isEscaped = post.isSighting && post.sightingStatus !== 'resolved';
  const isResolved = post.isSighting && post.sightingStatus === 'resolved';

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border bg-card shadow-xs transition-shadow hover:shadow-md',
        isEscaped ? 'border-escaped-border' : 'border-border'
      )}
    >
      {isEscaped && (
        <p className="bg-escaped-bg px-4 py-2.5 text-sm font-bold text-escaped">
          🚨 Escaped animal — help needed!
        </p>
      )}
      {isResolved && (
        <p className="bg-resolved-bg px-4 py-2.5 text-sm font-bold text-resolved">
          ✅ Reunited with owner
        </p>
      )}

      <div className="space-y-3 px-4 pt-4">
        <div className="flex items-center gap-3">
          <Link href={`/u/${post.userId}`} className="flex min-w-0 items-center gap-3 hover:underline">
            <UserAvatar name={post.userName} className="size-11" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-tight">{post.userName}</span>
              <time className="block text-xs text-muted-foreground" dateTime={new Date(post.timestamp).toISOString()}>
                {timeAgo(post.timestamp)}
              </time>
            </span>
          </Link>
          {info && (
            <span className="ml-auto shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-brand">
              {info.emoji} {info.label}
            </span>
          )}
        </div>

        <p className="text-sm leading-relaxed sm:text-[15px]">{post.caption}</p>
      </div>

      {/* Full-bleed like a LinkedIn post image; one column gives it room. */}
      <Link href={`/post/${post.id}`} className="mt-3 block">
        <PostPhoto
          src={post.photo}
          alt={post.caption || 'Reported animal'}
          emoji={info?.emoji ?? '🐾'}
          priority={priority}
          sizes="(max-width: 640px) 100vw, 576px"
        />
      </Link>

      <div className="space-y-3 p-4">

        {(post.primaryColor || post.markings) && (
          <dl className="grid grid-cols-1 gap-y-0.5 rounded-xl bg-muted p-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4 sm:gap-y-1">
            {post.primaryColor && (
              <>
                <dt className="mt-2 font-semibold text-muted-foreground first:mt-0 sm:mt-0">Color</dt>
                <dd className="break-words">{post.primaryColor}</dd>
              </>
            )}
            {(post.markingDetails.length > 0 || post.markings) && (
              <>
                <dt className="mt-2 font-semibold text-muted-foreground first:mt-0 sm:mt-0">Markings</dt>
                <dd className="break-words">
                  {post.markingDetails.length > 0 ? (
                    <>
                      <MarkingList markings={post.markingDetails} />
                      {post.markingNotes && <p className="mt-1">{post.markingNotes}</p>}
                    </>
                  ) : (
                    /* Reported before markings were structured. */
                    post.markings
                  )}
                </dd>
              </>
            )}
          </dl>
        )}

        {post.locationLabel && (
          <p className="text-sm text-muted-foreground">📍 {post.locationLabel}</p>
        )}

        <PostActions
          postId={post.id}
          liked={!!currentUserId && post.likes.includes(currentUserId)}
          likeCount={post.likes.length}
          confirmed={!!currentUserId && post.confirmations.includes(currentUserId)}
          confirmCount={post.confirmations.length}
          commentCount={post.comments.length}
          isSighting={post.isSighting}
          isAuthor={post.userId === currentUserId}
          resolved={post.sightingStatus === 'resolved'}
          signedIn={!!currentUserId}
        />
      </div>
    </article>
  );
}
