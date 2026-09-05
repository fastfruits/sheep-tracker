/**
 * Refuses to let destructive tests run against anything but a local Supabase.
 *
 * This is not belt-and-braces paranoia. Per Next's environment-variables guide,
 * `.env` is STILL loaded when NODE_ENV=test (only `.env.local` is skipped), and
 * this repo's `.env` holds live hosted credentials. So if `.env.test` were ever
 * missing a key, the fallback chain would silently hand the test suite the
 * production project — and these tests create users, insert posts and delete
 * rows.
 *
 * The URL is the load-bearing check: writes go wherever
 * NEXT_PUBLIC_SUPABASE_URL points, and a service-role key is only ever
 * transmitted *to* that URL. A mismatched key against a loopback URL fails
 * harmlessly; a correct key against a hosted URL does not.
 *
 * There is deliberately no ALLOW_REMOTE-style override. An env var that
 * disables this is an env var someone sets in CI at 2am.
 */

const LOCAL_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

/** The hosted project, named explicitly so a typo'd loopback check still catches it. */
const DENIED_HOSTNAMES = new Set(['svqurbxxbplswkvtybtz.supabase.co']);

export function assertLocalSupabase(): void {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!raw) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not set. Run `npm run db:start`, then re-run the tests.'
    );
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${raw}`);
  }

  const refuse = (why: string) =>
    new Error(
      `REFUSING to run destructive tests against ${url.origin} — ${why}.\n` +
        'Tests may only touch a local Supabase stack. Run `npm run db:start` ' +
        'and let tests/helpers/global-setup.ts supply the connection details.'
    );

  if (DENIED_HOSTNAMES.has(url.hostname)) throw refuse('this is the hosted project');
  if (url.hostname.endsWith('.supabase.co')) throw refuse('this is a hosted Supabase project');
  if (!LOCAL_HOSTNAMES.has(url.hostname)) throw refuse('the host is not loopback');

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Run `npm run db:start`, then re-run the tests.'
    );
  }
}
