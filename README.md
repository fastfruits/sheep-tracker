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
- `lib/matching.ts` — sighting → animal match rules. See
  [How matching works](#how-matching-works).
- `lib/markings.ts` — the structured-marking vocabulary and its parser.
- `proxy.ts` — refreshes the Supabase session on every request.

Feed and profile pages render on the server so sightings appear in the HTML that
search engines and link-preview bots receive. `/post/[id]` generates per-post
Open Graph metadata.

## How matching works

When a sighting is reported, `lib/notify.ts` loads every registered animal of
the same species (except the reporter's own) with the service-role client, and
`rankAnimals()` in `lib/matching.ts` decides which of them the sighting might
be. Each match writes one notification row to that animal's owner.

### Inputs

Both the reporter and the farmer describe an animal the same way:

- **Species** — must match exactly. Nothing crosses species.
- **Primary color** — free text ("black and white", "cream").
- **Markings** — up to six structured entries, each a closed-vocabulary
  **type** (ear tag, spray paint, collar, …), **color** (blue, yellow, …) and
  **location** (left ear, rump, …, or *Not sure*). Defined in
  `lib/markings.ts`.

Markings used to be a free-text box, and "blue tag left ear", "L ear blue tag
#42" and "blue eartag" could never be compared. The structured fields replace
it for matching. A free-text **marking notes** field is kept for oddities
("torn left ear") but is never used for matching.

### Color rule (the baseline)

Carried over from the React Native build, and deliberately loose. Colors match
if either one contains the other, or they share a word longer than two
characters, case-insensitively. So "black and white" matches "white". A blank
or whitespace-only color matches nothing. Without that guard, one empty field
would alert every sheep farmer.

### Marking scores

Each reported marking is compared with each of the animal's registered
markings, and the best pair counts:

| Reported vs. registered | Score |
|---|---|
| Same type, color **and** location | **3** (exact) |
| Same type and color, one side said *Not sure* | 2 |
| Same type and color, different locations | 1 |
| Same type, same location, **different color** | conflict |
| Anything else | 0 |

"Both ears" agrees with "left ear" and "right ear". An animal's score is the
sum across all reported markings. A registered marking the reporter didn't
mention costs nothing, because people miss markings far more often than they
invent them.

### Decision

For each same-species animal:

1. **Rule out.** If any reported marking conflicts (a yellow left-ear tag where
   the farmer registered a blue one) and no other marking scored, the animal is
   dropped. It is a different animal.
2. **Gate on color.** Otherwise the animal is kept if the color rule matches,
   **or** if its marking score is at least 3. A tag that matches exactly
   *rescues* an animal whose fleece was described differently ("white" vs.
   "dirty cream").
3. **Rank.** Matches are sorted by score, highest first. Ties keep database
   order. Each match gets a confidence level:
   - `strong`: score ≥ 3
   - `likely`: score 1–2
   - `possible`: color only, no markings corroborated

The reporter's confirmation screen shows the confidence and the markings that
lined up, so a color-only match never looks like a certainty. The farmer's
alert includes the markings the reporter described, so the farmer can judge the
match without opening the post.

### Legacy rows

Animals and posts from before structured markings have an empty
`markings_details` array. They score 0 on markings and fall back to the color
rule, which is how they behaved before. Every write also stores a readable
summary in the old `markings` text column (`formatMarkings()`), so older pages
keep rendering without a backfill. `parseMarkings()` drops any value outside
the vocabulary instead of trying to repair it.

## Testing

```bash
npm test           # unit tests only — no docker needed
npm run test:unit  # unit + integration (needs `npm run db:start`)
npm run typecheck
npm run lint
```

- `tests/unit/` — pure logic. `lib/matching.ts`'s rules, including the sharp
  edges (the two-character word cutoff, empty and whitespace-only colors).
- `tests/integration/` — `lib/notify.ts` against a real local Postgres with
  real RLS. Three of these assert policy behavior that cannot be expressed
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
