import Link from 'next/link';
import { PostPhoto } from './post-photo';
import { PostActions } from './post-actions';
import { speciesInfo, timeAgo } from '@/lib/species';
import type { Post } from '@/lib/types';
import { cn } from '@/lib/utils';

function initialColor(str: string) {
  const colors = ['#2E7D32', '#1565C0', '#6A1B9A', '#AD1457', '#00695C', '#E65100'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

/**
 * Server-rendered so the caption, species and location are in the HTML that
 * crawlers and link-preview bots see. Interactive controls (like, confirm,
 * comment) are separate client islands.
 */
export function PostCard({ post, currentUserId }: { post: Post; currentUserId?: string }) {
  const info = speciesInfo(post.species);
  const isEscaped = post.isSighting && post.sightingStatus !== 'resolved';
  const isResolved = post.isSighting && post.sightingStatus === 'resolved';

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg',
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

      <Link href={`/post/${post.id}`} className="block">
        <PostPhoto
          src={post.photo}
          alt={post.caption || 'Reported animal'}
          emoji={info?.emoji ?? '🐾'}
        />
      </Link>

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <Link href={`/u/${post.userId}`} className="flex items-center gap-3 hover:underline">
            <span
              className="grid size-9 place-items-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: initialColor(post.userName) }}
              aria-hidden
            >
              {post.userName.charAt(0).toUpperCase()}
            </span>
            <span>
              <span className="block text-sm font-bold leading-tight">{post.userName}</span>
              <time className="block text-xs text-muted-foreground" dateTime={new Date(post.timestamp).toISOString()}>
                {timeAgo(post.timestamp)}
              </time>
            </span>
          </Link>
          {info && (
            <span className="ml-auto rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-brand">
              {info.emoji} {info.label}
            </span>
          )}
        </div>

        <p className="text-[15px] leading-relaxed">{post.caption}</p>

        {(post.primaryColor || post.markings) && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl bg-muted p-3 text-sm">
            {post.primaryColor && (
              <>
                <dt className="font-semibold text-muted-foreground">Colour</dt>
                <dd>{post.primaryColor}</dd>
              </>
            )}
            {post.markings && (
              <>
                <dt className="font-semibold text-muted-foreground">Markings</dt>
                <dd>{post.markings}</dd>
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
