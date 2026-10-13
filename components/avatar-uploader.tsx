'use client';

import { useRef, useTransition } from 'react';
import { toast } from 'sonner';
import { Camera } from 'lucide-react';

import { removeAvatar, uploadAvatar } from '@/app/actions/profile';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';

const SIZE = 512;

/**
 * Center-crops to a square and scales to 512px before upload. Phone photos are
 * several MB — over the 1 MB Server Action body limit — and an avatar never
 * renders above ~100px anyway. Also re-encodes HEIC/odd formats to JPEG where
 * the browser can decode them.
 */
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const out = Math.min(side, SIZE);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = out;
  canvas
    .getContext('2d')!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.88)
  );
}

export function AvatarUploader({ name, src }: { name: string; src?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function onPick(file: File | undefined) {
    if (!file) return;
    startTransition(async () => {
      let blob: Blob;
      try {
        blob = await toSquareJpeg(file);
      } catch {
        toast.error("That image couldn't be read. Try a JPEG or PNG.");
        return;
      }
      const fd = new FormData();
      fd.append('avatar', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      const r = await uploadAvatar(fd);
      if (r.ok) toast.success('Profile picture updated');
      else toast.error(r.error ?? 'Upload failed');
    });
    if (input.current) input.current.value = '';
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={pending}
        className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
        aria-label={src ? 'Change profile picture' : 'Add profile picture'}
      >
        <UserAvatar name={name} src={src} className="size-20 text-2xl font-extrabold" />
        <span
          className="absolute -bottom-0.5 -right-0.5 grid size-7 place-items-center rounded-full border-2 border-card bg-primary text-primary-foreground"
          aria-hidden
        >
          <Camera className="size-3.5" />
        </span>
      </button>
      <div className="flex flex-col items-start gap-1">
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => input.current?.click()}>
          {pending ? 'Saving…' : src ? 'Change photo' : 'Add photo'}
        </Button>
        {src && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            className="text-muted-foreground"
            onClick={() =>
              startTransition(async () => {
                const r = await removeAvatar();
                if (r.ok) toast.success('Profile picture removed');
                else toast.error(r.error ?? 'Could not remove');
              })
            }
          >
            Remove
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={e => onPick(e.target.files?.[0])}
      />
    </div>
  );
}
