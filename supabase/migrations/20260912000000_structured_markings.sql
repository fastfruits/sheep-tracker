-- ═══════════════════════════════════════════════════════════════════════════
-- Structured distinguishing markings.
--
-- Replaces the free-text "markings" box on both sides of a match with a closed
-- vocabulary (type + colour + location), stored as jsonb. See lib/markings.ts
-- for the vocabulary and lib/matching.ts for how it is scored.
--
-- ── Why a second migration rather than editing the initial one ─────────────
--
-- 20260901000000 is consolidated *as the initial state*, not as a rolling
-- snapshot. The hosted project has already been built from it, so rewriting it
-- in place would leave the local stack and production silently divergent with
-- no recorded version to tell them apart. This adds a version both can reach.
--
-- ── Why the old text columns stay ──────────────────────────────────────────
--
-- `animals.markings` and `posts.markings` continue to hold a human-readable
-- summary, written from the structured values by formatMarkings(). Every row
-- that predates this change keeps its text and keeps rendering; the feed, the
-- post page and the farmer's animal list need no backfill. Matching reads only
-- the jsonb, so a legacy row scores 0 on markings and falls back to the colour
-- rule — exactly the behaviour it had before.
--
-- ── Safety ─────────────────────────────────────────────────────────────────
--
-- Additive only. No drops, no type changes, no data rewritten. Every column is
-- nullable with a constant default, so on PostgreSQL 11+ `add column` is a
-- catalog-only change: no table rewrite, only a brief ACCESS EXCLUSIVE lock.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Animals ─────────────────────────────────────────────────────────────────
alter table animals add column if not exists markings_details jsonb not null default '[]'::jsonb;
alter table animals add column if not exists marking_notes    text;

-- ── Posts (sightings) ───────────────────────────────────────────────────────
alter table posts   add column if not exists markings_details jsonb not null default '[]'::jsonb;
alter table posts   add column if not exists marking_notes    text;

-- ── Farmer alerts ───────────────────────────────────────────────────────────
-- The rendered marking list travels with the alert so a farmer can judge it
-- from the notification itself, without opening the post.
alter table notifications add column if not exists reported_markings text;

-- ── Integrity ───────────────────────────────────────────────────────────────
-- The app validates against the vocabulary in lib/markings.ts before writing,
-- but the service-role key bypasses RLS and nothing else constrains jsonb. A
-- non-array here would make rankAnimals() iterate a scalar, so pin the shape
-- at the one place that cannot be bypassed. `not valid` skips the scan of
-- existing rows; the default above means every one of them already conforms.
alter table animals add constraint animals_markings_details_is_array
  check (jsonb_typeof(markings_details) = 'array') not valid;
alter table posts   add constraint posts_markings_details_is_array
  check (jsonb_typeof(markings_details) = 'array') not valid;
