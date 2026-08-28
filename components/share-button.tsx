'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/**
 * Shares the page URL. The React Native build shared a plain text blob with no
 * link, so a shared sighting could not be opened by whoever received it.
 */
export function ShareButton({ className }: { className?: string }) {
  async function share() {
    const url = window.location.href;
    const title = document.title;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied', { description: 'Paste it anywhere to share this sighting.' });
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  return (
    <Button variant="outline" size="sm" className={className} onClick={share}>
      Share
    </Button>
  );
}
