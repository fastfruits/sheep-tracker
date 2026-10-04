import Link from 'next/link';
import { ChevronRight, MapPin } from 'lucide-react';

import { UserAvatar } from './user-avatar';
import { speciesInfo, timeAgo } from '@/lib/species';
import type { Post, User } from '@/lib/types';

const cardClass = 'overflow-hidden rounded-2xl border border-border bg-card';

/** Left rail: who you are, or a sign-in prompt. */
export function ProfileCard({ user, postCount }: { user: User | null; postCount: number }) {
  if (!user) {
    return (
      <section className={`${cardClass} p-5 text-center`}>
        <p className="text-4xl" aria-hidden>🐑</p>
        <h2 className="mt-3 font-bold">Join the flock</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to report sightings, confirm ones you&apos;ve seen and get alerts for your animals.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Sign in
        </Link>
      </section>
    );
  }

  return (
    <section className={cardClass}>
      <div className="h-14 bg-gradient-to-r from-brand to-brand-mid" aria-hidden />
      <div className="-mt-8 px-5 pb-5 text-center">
        <Link href={`/u/${user.id}`} className="inline-block rounded-full ring-4 ring-card">
          <UserAvatar name={user.name} className="size-16 text-xl" />
        </Link>
        <Link href={`/u/${user.id}`} className="mt-2 block font-bold hover:underline">
          {user.name}
        </Link>
        <p className="text-sm text-muted-foreground">
          {user.isFarmer ? `🌾 ${user.farmName ?? 'Farmer'}` : 'Community member'}
        </p>
      </div>
      <dl className="border-t border-border px-5 py-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Your recent posts</dt>
          <dd className="font-bold text-brand">{postCount}</dd>
        </div>
      </dl>
      <Link
        href="/account"
        className="flex items-center justify-between border-t border-border px-5 py-3 text-sm font-semibold transition-colors hover:bg-muted"
      >
        {user.isFarmer ? 'My animals & alerts' : 'My account'}
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </Link>
    </section>
  );
}

/** Top-of-feed prompt, LinkedIn "start a post" style. */
export function ReportPrompt({ user }: { user: User | null }) {
  return (
    <section className={`${cardClass} p-4`}>
      <div className="flex items-center gap-3">
        {user ? (
          <UserAvatar name={user.name} className="size-11" />
        ) : (
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-xl" aria-hidden>🐾</span>
        )}
        <Link
          href="/"
          className="flex min-h-11 flex-1 items-center rounded-full border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          <span className="sm:hidden">Report a loose animal…</span>
          <span className="hidden sm:inline">Spotted a loose animal? Report it…</span>
        </Link>
      </div>
      <div className="mt-3 flex gap-1 text-sm font-semibold text-muted-foreground">
        <Link href="/" className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg transition-colors hover:bg-muted">
          <span aria-hidden>📷</span> Photo
        </Link>
        <Link href="/" className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg transition-colors hover:bg-muted">
          <span aria-hidden>📍</span> Location
        </Link>
        <Link href="/" className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg transition-colors hover:bg-muted">
          <span aria-hidden>🚨</span> Sighting
        </Link>
      </div>
    </section>
  );
}

/** Right rail: the open sightings that most need eyes, newest first. */
export function OpenSightingsCard({ posts }: { posts: Post[] }) {
  const open = posts.filter(p => p.isSighting && p.sightingStatus !== 'resolved').slice(0, 5);

  return (
    <section className={cardClass}>
      <h2 className="flex items-center gap-2 px-5 pt-4 font-bold">
        <span className="relative flex size-2.5" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-escaped opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-escaped" />
        </span>
        Open sightings
      </h2>
      {open.length === 0 ? (
        <p className="px-5 pb-5 pt-2 text-sm text-muted-foreground">All animals are home. 🎉</p>
      ) : (
        <ul className="py-2">
          {open.map(post => {
            const info = speciesInfo(post.species);
            return (
              <li key={post.id}>
                <Link href={`/post/${post.id}`} className="flex gap-3 px-5 py-2.5 transition-colors hover:bg-muted">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-escaped-bg text-lg" aria-hidden>
                    {info?.emoji ?? '🐾'}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {info?.label ?? 'Animal'}{post.primaryColor ? ` · ${post.primaryColor}` : ''}
                    </span>
                    <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      {post.locationLabel && <MapPin className="size-3 shrink-0" aria-hidden />}
                      <span className="truncate">{post.locationLabel ?? 'Location unknown'}</span>
                    </span>
                    <span className="block text-xs text-muted-foreground">{timeAgo(post.timestamp)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Right rail: community totals. */
export function CommunityStats({ posts }: { posts: Post[] }) {
  const sightings = posts.filter(p => p.isSighting);
  const reunited = sightings.filter(p => p.sightingStatus === 'resolved').length;
  const confirmations = posts.reduce((n, p) => n + p.confirmations.length, 0);
  const stats = [
    { label: 'Sightings', value: sightings.length },
    { label: 'Reunited', value: reunited },
    { label: 'Confirms', value: confirmations },
  ];

  return (
    <section className={`${cardClass} p-5`}>
      <h2 className="font-bold">Community at a glance</h2>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl bg-muted px-2 py-3">
            <dd className="text-xl font-extrabold text-brand">{s.value}</dd>
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Right rail: short explainer for first-time visitors. */
export function HowItWorksCard() {
  const steps = [
    ['📸', 'Snap a photo of the loose animal'],
    ['🏷️', 'Describe its color and markings'],
    ['🔔', 'Matching farmers get alerted instantly'],
  ];
  return (
    <section className={`${cardClass} p-5`}>
      <h2 className="font-bold">How SheepFinder works</h2>
      <ol className="mt-3 space-y-2.5 text-sm">
        {steps.map(([emoji, text]) => (
          <li key={text} className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary" aria-hidden>{emoji}</span>
            {text}
          </li>
        ))}
      </ol>
      <Link href="/about" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
        Learn more →
      </Link>
    </section>
  );
}
