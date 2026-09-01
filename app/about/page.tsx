import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description:
    'SheepFinder connects people who spot escaped livestock with the farmers who own them.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">About SheepFinder</h1>
      <p className="mt-2 text-muted-foreground">
        A sheep on the road is somebody&apos;s sheep. SheepFinder exists to close the
        gap between the person who spots it and the farmer who has been looking
        for it.
      </p>

      <h2 className="mt-8 text-lg font-semibold">How it works</h2>
      <p className="mt-2 text-muted-foreground">
        Report a sighting in a few seconds: what you saw, its color and
        markings, an optional photo, and where you saw it. The report is posted
        to the community feed so neighbors can confirm it or add detail.
      </p>
      <p className="mt-3 text-muted-foreground">
        Behind the scenes, every new sighting is compared against the animals
        farmers have registered. When the species and coloring line up, the
        owner is alerted straight away with your location — no phone tree, no
        guessing which farm to try first.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Two kinds of account</h2>
      <p className="mt-2 text-muted-foreground">
        Anyone can report a sighting. Farmer accounts can additionally register
        animals — sheep, cows, goats, pigs, horses, dogs, cats, chickens — and
        receive the matching alerts.
      </p>

      <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold">
        <Link href="/" className="text-brand hover:underline">
          Report a sighting
        </Link>
        <Link href="/login" className="text-brand hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  );
}
