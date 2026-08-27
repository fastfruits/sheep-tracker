import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const DESCRIPTION =
  'Spotted an escaped sheep, cow or goat? Report it in seconds and the farmer who owns it is alerted instantly, with your location.';

/**
 * Wraps every statically-exported page. Static rendering only runs this in
 * Node at build time, so it must not use client-side APIs.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="description" content={DESCRIPTION} />
        <meta name="theme-color" content="#1B4D0E" />
        <meta property="og:type" content="website" />
        <meta property="og:description" content={DESCRIPTION} />
        <meta name="twitter:card" content="summary" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
