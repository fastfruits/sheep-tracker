'use client';

import { useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';
import { toggleFollow } from '@/app/actions/posts';
import { Button } from '@/components/ui/button';

export function FollowButton({
  targetId, following, className,
}: { targetId: string; following: boolean; className?: string }) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(following, (_s, next: boolean) => next);

  return (
    <Button
      variant={optimistic ? 'outline' : 'default'}
      className={className}
      onClick={() => {
        startTransition(async () => {
          setOptimistic(!optimistic);
          const r = await toggleFollow(targetId, optimistic);
          if (!r.ok) toast.error(r.error ?? 'Could not update');
        });
      }}
    >
      {optimistic ? 'Following' : 'Follow'}
    </Button>
  );
}
