'use client';

import Image from 'next/image';
import { useState } from 'react';

/**
 * Post photo with a fallback to the species emoji.
 *
 * Needed because the storage bucket contains zero-byte objects written by the
 * old React Native upload path: they return 200 with content-type image/jpeg
 * and no body, so next/image rejects them with a 400 and the card would show a
 * blank grey rectangle. Failing over to the emoji keeps the card readable.
 */
export function PostPhoto({
  src,
  alt,
  emoji,
  priority,
  sizes = '(max-width: 768px) 100vw, 512px',
}: {
  src?: string;
  alt: string;
  emoji: string;
  priority?: boolean;
  /** Override for grid layouts (e.g. the 2-up profile tiles) so phones don't
   *  download a full-width image per thumbnail. */
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="grid aspect-[4/3] w-full place-items-center bg-muted text-5xl sm:text-6xl">
        <span aria-hidden>{emoji}</span>
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] w-full bg-muted">
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover"
        priority={priority}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
