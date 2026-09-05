-- ═══════════════════════════════════════════════════════════════════════════
-- REPAIR: add the seven `notifications` columns that the app writes but the
-- live database does not have.
--
--   Run this against the hosted project, once:
--     psql "$DATABASE_URL" < supabase/fix-notifications-columns.sql
--   or paste it into Supabase → SQL Editor → Run.
--
-- ── Why this file exists ────────────────────────────────────────────────────
--
-- `schema.sql` declares these columns, but they were never applied to the
-- live project. Verified against production on 2026-09-02: every one of them
-- returns `column notifications.<name> does not exist`, and the live table has
-- only id, farmer_id, post_id, animal_id, read, created_at.
--
-- The consequence is not cosmetic. `notifyMatchingFarmers` in
-- app/actions/report.ts inserts all seven on every match, so **every farmer
-- alert insert has been failing**. The failure is only `console.error`'d
-- (report.ts:167) and `matched` is returned regardless, so report-form.tsx
-- still renders "🔔 Farmer notified!". No farmer has ever received an alert,
-- and nothing surfaced it.
--
-- ── Safety ─────────────────────────────────────────────────────────────────
--
-- Additive only. No drops, no type changes, no data rewritten. Every column is
-- nullable with no default, so `add column` is a catalog-only change: it does
-- not rewrite the table and takes only a brief ACCESS EXCLUSIVE lock.
-- Re-running the file is a no-op.
--
-- Column names, types and nullability are copied from the `create table` in
-- schema.sql so that a database built fresh from that file and a database
-- repaired by this one end up identical.
-- ═══════════════════════════════════════════════════════════════════════════

alter table notifications add column if not exists animal_name      text;
alter table notifications add column if not exists species          text;
alter table notifications add column if not exists reporter_name    text;
alter table notifications add column if not exists reporter_caption text;
alter table notifications add column if not exists location_label   text;
alter table notifications add column if not exists latitude         double precision;
alter table notifications add column if not exists longitude        double precision;

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Expect exactly 13 rows, including all seven added above:
--
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'notifications'
--   order by ordinal_position;
--
-- Then report a sighting that matches a registered animal and confirm a row
-- actually lands, rather than trusting the UI's success message:
--
--   select id, farmer_id, animal_name, reporter_name, location_label, created_at
--   from notifications order by created_at desc limit 5;

-- ── Not included, on purpose ────────────────────────────────────────────────
-- `notifications` has no index on farmer_id, and both getNotifications() and
-- the nav's unread badge filter by it on every request. Worth adding, but
-- `create index` takes a lock that blocks writes for the duration, so it is a
-- separate decision from this repair rather than something to bundle into it:
--
--   create index concurrently if not exists notifications_farmer_idx
--     on notifications (farmer_id, created_at desc);
--
-- `concurrently` cannot run inside a transaction block — run that line on its
-- own, not as part of this file.
