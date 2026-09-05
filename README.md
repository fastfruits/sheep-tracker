# SheepFinder

Report escaped livestock. Farmers register their animals; when someone reports a
sighting whose description matches, the owner is alerted with the reporter's
location.

Next.js App Router · React Server Components · Supabase · Tailwind v4 + shadcn/ui.

## Getting started

```bash
npm install
cp .env.example .env   # then fill it in
npm run dev
```

### Environment

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Inlined into the JS bundle. Public by design. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Also public. RLS is what protects the data, not this key. |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | No `NEXT_PUBLIC_` prefix. With one, Next.js inlines it into the client bundle and hands every visitor full database access. |

The service-role key is used by the report action to match a sighting against
every farmer's animals and to write notification rows addressed to other users —
two things a visitor's own session must not be able to do.

### Database

**Local development and tests** use the Supabase CLI stack, built from
`supabase/migrations/`:

```bash
npm run db:start     # docker required; ~60s on the first run
npm run db:seed      # farmer@example.test + reporter@example.test, password test-password-123
npm run dev:local    # next dev pointed at the local stack instead of the hosted project
npm run db:reset     # drop, replay migrations, re-seed
npm run db:stop
```

`npm run dev` still points at the hosted project via `.env`; `dev:local`
injects the local stack's credentials instead, so the two never get confused.

**The hosted project** predates the migrations and is still managed by the
hand-run files, in order, once per project:

```bash
supabase/schema.sql     # tables, storage bucket, RLS enabled (no policies)
supabase/rls.sql        # the policies
supabase/rls-web.sql    # tightening pass; requires the service-role key
```

`schema.sql` enables RLS but grants nothing, so the app cannot read anything
until `rls.sql` runs. All three are safe to re-run.

> **Outstanding repair.** The hosted `notifications` table is missing the seven
> detail columns the report action writes, so farmer alerts have been failing
> there silently. Apply `supabase/fix-notifications-columns.sql` once — it is
> additive and idempotent. The local stack already has them.

Local and hosted are therefore two sources of truth. `supabase/schema.sql` and
`supabase/rls.sql` carry headers describing the known divergences.

### Supabase configuration

Authentication → URL Configuration:

- **Site URL** — your deployed origin
- **Redirect URLs** — add `<origin>/auth/callback`

Without the callback URL, confirmation emails dead-end and new accounts never
get a profile row.

## Architecture

- `app/` — routes. Pages are Server Components; interactivity lives in small
  client islands (`components/post-actions.tsx`, `follow-button.tsx`).
- `app/actions/` — Server Actions. All writes go through these.
- `lib/data/` — server-side queries. Import `server-only`.
- `lib/supabase/` — `server.ts` (cookies), `client.ts` (browser),
  `admin.ts` (service role, never import from a client component).
- `lib/matching.ts` — sighting → animal match rules, ported from the previous
  React Native build.
- `proxy.ts` — refreshes the Supabase session on every request.

Feed and profile pages render on the server so sightings appear in the HTML that
search engines and link-preview bots receive. `/post/[id]` generates per-post
Open Graph metadata.

## Testing

```bash
npm test           # unit tests only — no docker needed
npm run test:unit  # unit + integration (needs `npm run db:start`)
npm run typecheck
npm run lint
```

- `tests/unit/` — pure logic. `lib/matching.ts`'s rules, including the sharp
  edges (the two-character word cutoff, empty and whitespace-only colours).
- `tests/integration/` — `lib/notify.ts` against a real local Postgres with
  real RLS. Three of these assert policy behaviour that cannot be expressed
  any other way: one farmer cannot read another's notifications, an
  authenticated client cannot fabricate an alert, and `animals` is owner-only.

`tests/helpers/guard.ts` refuses to run against anything but a loopback
Supabase URL, and `tests/helpers/global-setup.ts` overwrites the connection
details from `supabase status` before any test file loads. Both exist because
Next still loads `.env` when `NODE_ENV=test`, and `.env` holds production
credentials.

`lib/notify.ts` is deliberately free of `next/*` imports so it can be imported
directly by the test runner; `app/actions/report.ts` cannot be, because it
calls `cookies()` and `revalidatePath()`.

## Deploying to Vercel

Framework Preset **Next.js** (auto-detected — there is deliberately no
`vercel.json`). Set all three environment variables for Production *and*
Preview.

> If this project was previously deployed as the Expo build, change the
> Framework Preset from **Other** to **Next.js** and clear the build-command and
> output-directory overrides.

## History

This was an Expo / React Native app rendered to web via react-native-web. It is
now web-only; the native build was removed. The React Native source remains in
git history.
