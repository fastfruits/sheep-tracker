import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'The ground rules for using SheepFinder.',
};

const LAST_UPDATED = '1 September 2026';

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Terms</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {LAST_UPDATED}</p>

      <h2 className="mt-6 text-base font-semibold sm:mt-8 sm:text-lg">Not an emergency service</h2>
      <p className="mt-2 text-muted-foreground">
        SheepFinder is a community reporting tool. It is not an emergency
        service, a veterinary service, or a substitute for either. If an animal
        is loose on a road, injured, or putting anyone in danger, contact the
        police or the relevant local authority first.
      </p>

      <h2 className="mt-6 text-base font-semibold sm:mt-8 sm:text-lg">Reports are unverified</h2>
      <p className="mt-2 text-muted-foreground">
        Sightings, photos, comments and confirmations are submitted by other
        users. We do not check them. A match between a sighting and a registered
        animal is a guess based on species and coloring. We cannot promise an owner will be found, that an alert
        will be seen, or that anyone will respond.
      </p>

      <h2 className="mt-6 text-base font-semibold sm:mt-8 sm:text-lg">Using the site</h2>
      <p className="mt-2 text-muted-foreground">
        Report honestly and only what you have actually seen. Post photos you
        took yourself. Do not use the site to harass anyone, to enter someone
        else&apos;s land, or to claim an animal that is not yours. We may remove
        posts or accounts that break these rules.
      </p>

      <h2 className="mt-6 text-base font-semibold sm:mt-8 sm:text-lg">Your content</h2>
      <p className="mt-2 text-muted-foreground">
        What you post stays yours. By posting it you allow us to display it on
        the site, including in the public feed and in link previews, so that
        the animal&apos;s owner and fellow users can see it.
      </p>

      <h2 className="mt-6 text-base font-semibold sm:mt-8 sm:text-lg">Availability</h2>
      <p className="mt-2 text-muted-foreground">
        SheepFinder is provided as-is, with no guarantee that it will be
        available or working at any given moment.
      </p>
    </div>
  );
}
