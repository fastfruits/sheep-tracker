import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What SheepFinder collects when you report a sighting, and who can see it.',
};

const LAST_UPDATED = '1 September 2026';

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Privacy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {LAST_UPDATED}</p>

      <h2 className="mt-8 text-lg font-semibold">What we collect</h2>
      <p className="mt-2 text-muted-foreground">
        When you report a sighting we store what you type species, color,
        markings, caption along with any photo you attach and the coordinates
        of the location you provide. Coordinates are stored exactly as given,
        not rounded.
      </p>
      <p className="mt-3 text-muted-foreground">
        If you create an account we store your email address, your display name,
        and, for farmer accounts, your farm name and the details of the animals
        you register.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Who can see it</h2>
      <p className="mt-2 text-muted-foreground">
        Sightings are public. Your display name, caption, photo, location label
        and the map position appear in the community feed and on your profile,
        and they are included in the page HTML that search engines and
        link-preview bots receive.
      </p>
      <p className="mt-3 text-muted-foreground">
        When a sighting matches a registered animal, that animal&apos;s owner is
        sent an alert containing your display name, your caption and your
        location. Your email address is never shown to other users.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Where it is stored</h2>
      <p className="mt-2 text-muted-foreground">
        Accounts, sightings and photos are stored with Supabase, which hosts the
        database and file storage behind this site. Sign-in is handled by
        Supabase Auth.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Your choices</h2>
      <p className="mt-2 text-muted-foreground">
        You can report a sighting without an account. You can leave the location
        off a report, though that makes it much less useful to the owner. To
        have your account and posts deleted, email me.
      </p>
    </div>
  );
}
