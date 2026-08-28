-- ═══════════════════════════════════════════════════════════════════════════
-- Tightening pass, enabled by the move to server-side rendering.
--
-- Run AFTER schema.sql and rls.sql:
--   psql < supabase/rls-web.sql    (or paste into the Supabase SQL editor)
--
-- Three policies in rls.sql were deliberately loose because the React Native
-- client had no server to do the work. It does now, so they can close.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Push tokens ──────────────────────────────────────────────────────────
-- The native app is gone, so Expo push tokens are dead data. While the column
-- existed, `profiles` had public select and every user's token was readable by
-- anyone — and Expo's push API accepts sends from anywhere.
alter table profiles drop column if exists push_token;

-- ── 2. Farm inventories ─────────────────────────────────────────────────────
-- `animals` was publicly readable only because sighting matching ran in the
-- browser, which meant shipping every farmer's livestock list to every visitor.
-- Matching now happens in the report Server Action using the service-role key,
-- so owners get their data back.
drop policy if exists "animals are publicly readable" on animals;

create policy "farmers read their own animals"
  on animals for select using (auth.uid() = owner_id);

-- ── 3. Fabricated farmer alerts ─────────────────────────────────────────────
-- `notifications` accepted an insert from any authenticated user, because a
-- reporter writes rows addressed to *other* people. That let any signed-up
-- account invent an alert with a fake animal, reporter and GPS position.
-- The report action is now the only writer, via the service-role key, which
-- bypasses RLS — so no client-facing insert policy is needed at all.
drop policy if exists "signed-in users create notifications" on notifications;

-- Select and update remain restricted to the recipient (from rls.sql):
--   "farmers read their own notifications"
--   "farmers update their own notifications"

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Expect zero rows for both:
--   select 1 from information_schema.columns
--     where table_name='profiles' and column_name='push_token';
--   select 1 from pg_policies
--     where tablename='animals' and policyname='animals are publicly readable';
