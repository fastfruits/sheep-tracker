'use client';

import { useEffect } from 'react';
import { speciesInfo, timeAgo } from '@/lib/species';
import { markNotificationsRead } from '@/app/actions/posts';
import type { FarmerNotification } from '@/lib/types';

/**
 * Farmer alerts. Marks them read on mount, mirroring the RN app where opening
 * the notifications sheet cleared the badge.
 */
export function AlertList({ notifications }: { notifications: FarmerNotification[] }) {
  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (unread > 0) markNotificationsRead();
  }, [unread]);

  if (notifications.length === 0) {
    return (
      <p className="mt-4 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No alerts yet. You&apos;ll see one here the moment a sighting matches one of your animals.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-3">
      {notifications.map(n => (
        <li
          key={n.id}
          className={`rounded-2xl border p-4 ${n.read ? 'border-border bg-card' : 'border-amber-note-border bg-amber-note-bg'}`}
        >
          <div className="flex items-center gap-2">
            <span aria-hidden>{speciesInfo(n.species)?.emoji ?? '🐾'}</span>
            <p className="min-w-0 truncate font-bold">Possible match: {n.animalName}</p>
            <time className="ml-auto shrink-0 text-xs text-muted-foreground" dateTime={new Date(n.timestamp).toISOString()}>
              {timeAgo(n.timestamp)}
            </time>
          </div>
          <p className="mt-2 text-sm">
            <span className="font-semibold">{n.reporterName}</span> reported: &ldquo;{n.reporterCaption}&rdquo;
          </p>
          {n.reportedMarkings && (
            <p className="mt-1 text-sm">
              <span className="font-semibold text-muted-foreground">Markings seen: </span>
              {n.reportedMarkings}
            </p>
          )}
          {n.locationLabel && <p className="mt-1 text-sm text-muted-foreground">📍 {n.locationLabel}</p>}
          {n.latitude != null && n.longitude != null && (
            <a
              className="mt-1 inline-block break-all font-mono text-xs text-brand hover:underline"
              href={`https://www.google.com/maps/search/?api=1&query=${n.latitude},${n.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {n.latitude.toFixed(5)}, {n.longitude.toFixed(5)}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
