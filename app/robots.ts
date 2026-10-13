import type { MetadataRoute } from 'next';

/**
 * Public pages (home, feed, sightings, profiles, legal) are crawlable — the
 * feed is server-rendered precisely so sightings show up in search. Private
 * and transactional routes are not: they either redirect anonymous crawlers to
 * /login or have nothing worth indexing.
 *
 * Disallow is a crawl hint, not access control. Anything sensitive is guarded
 * by auth and RLS regardless of what a bot chooses to honor.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/account', // signed-in only; redirects to /login
          '/login',
          '/auth/', // OAuth / email-confirmation callback
        ],
      },
      {
        // AI training crawlers. Sighting posts include reporters' names and
        // GPS positions; there's no reason to feed them into training sets.
        // Search crawlers (Googlebot, Bingbot, Applebot) are unaffected.
        userAgent: ['GPTBot', 'ClaudeBot', 'CCBot', 'Google-Extended', 'Applebot-Extended', 'Bytespider', 'meta-externalagent'],
        disallow: '/',
      },
    ],
  };
}
