'use client';

import { useOptimistic, useTransition, useState } from 'react';
import { toast } from 'sonner';

import { toggleLike, toggleConfirmation, addComment, markReunited } from '@/app/actions/posts';
import { ShareButton } from './share-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
  postId: string;
  liked: boolean;
  likeCount: number;
  confirmed: boolean;
  confirmCount: number;
  commentCount: number;
  isSighting: boolean;
  isAuthor: boolean;
  resolved: boolean;
  signedIn: boolean;
  showComposer?: boolean;
}

/**
 * Client island for the interactive row on a post. `useOptimistic` replaces the
 * hand-rolled optimistic state the RN store kept in a Context — the server
 * action revalidates and the real count replaces the guess.
 */
export function PostActions({
  postId, liked, likeCount, confirmed, confirmCount, commentCount,
  isSighting, isAuthor, resolved, signedIn, showComposer,
}: Props) {
  const [, startTransition] = useTransition();
  const [comment, setComment] = useState('');

  const [optimisticLike, setOptimisticLike] = useOptimistic(
    { liked, count: likeCount },
    (_state, next: { liked: boolean; count: number }) => next
  );
  const [optimisticConfirm, setOptimisticConfirm] = useOptimistic(
    { confirmed, count: confirmCount },
    (_state, next: { confirmed: boolean; count: number }) => next
  );

  function guard() {
    if (!signedIn) { toast.error('Sign in to do that'); return false; }
    return true;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm">
        <button
          type="button"
          className={cn('font-semibold transition-colors', optimisticLike.liked ? 'text-destructive' : 'text-muted-foreground hover:text-foreground')}
          onClick={() => {
            if (!guard()) return;
            startTransition(async () => {
              setOptimisticLike({
                liked: !optimisticLike.liked,
                count: optimisticLike.count + (optimisticLike.liked ? -1 : 1),
              });
              const r = await toggleLike(postId, optimisticLike.liked);
              if (!r.ok) toast.error(r.error ?? 'Could not update');
            });
          }}
        >
          {optimisticLike.liked ? '❤️' : '🤍'} {optimisticLike.count}
        </button>

        <span className="text-muted-foreground">💬 {commentCount}</span>

        {isSighting && !resolved && (
          <button
            type="button"
            className={cn(
              'rounded-full px-3 py-1 text-xs font-bold transition-colors',
              optimisticConfirm.confirmed
                ? 'bg-confirm text-white'
                : 'bg-confirm-bg text-confirm hover:brightness-95'
            )}
            onClick={() => {
              if (!guard()) return;
              startTransition(async () => {
                setOptimisticConfirm({
                  confirmed: !optimisticConfirm.confirmed,
                  count: optimisticConfirm.count + (optimisticConfirm.confirmed ? -1 : 1),
                });
                const r = await toggleConfirmation(postId, optimisticConfirm.confirmed);
                if (!r.ok) toast.error(r.error ?? 'Could not update');
              });
            }}
          >
            👁 {optimisticConfirm.confirmed ? 'Seen it too' : `Seen (${optimisticConfirm.count})`}
          </button>
        )}

        {isAuthor && isSighting && !resolved && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              startTransition(async () => {
                const r = await markReunited(postId);
                if (r.ok) toast.success('Marked as reunited');
                else toast.error(r.error ?? 'Could not update');
              });
            }}
          >
            Mark reunited
          </Button>
        )}

        <ShareButton className="ml-auto" />
      </div>

      {showComposer && (
        <form
          className="flex gap-2"
          onSubmit={e => {
            e.preventDefault();
            if (!guard()) return;
            const text = comment;
            setComment('');
            startTransition(async () => {
              const r = await addComment(postId, text);
              if (!r.ok) { toast.error(r.error ?? 'Could not comment'); setComment(text); }
            });
          }}
        >
          <Input
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Add a comment…"
            aria-label="Add a comment"
          />
          <Button type="submit" disabled={!comment.trim()}>Post</Button>
        </form>
      )}
    </div>
  );
}
