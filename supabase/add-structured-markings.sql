-- ═══════════════════════════════════════════════════════════════════════════
-- HAND-RUN: add the structured-markings columns to the HOSTED project.
--
--   psql "$DATABASE_URL" < supabase/add-structured-markings.sql
--   or paste it into Supabase → SQL Editor → Run.
--
-- This is the hosted-project twin of
-- supabase/migrations/20260912000000_structured_markings.sql, which covers the
-- local CLI stack. The two files are identical in effect; read that one for
-- the full rationale.
--
-- Additive only, and re-running it is a no-op. Without it the app writes
-- `markings_details` on every report and animal registration and Postgres
-- returns 42703 — the same failure mode as the notifications columns
-- documented in supabase/fix-notifications-columns.sql, where the insert died
-- silently and the UI still claimed success.
-- ═══════════════════════════════════════════════════════════════════════════

alter table animals       add column if not exists markings_details  jsonb not null default '[]'::jsonb;
alter table animals       add column if not exists marking_notes     text;
alter table posts         add column if not exists markings_details  jsonb not null default '[]'::jsonb;
alter table posts         add column if not exists marking_notes     text;
alter table notifications add column if not exists reported_markings text;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   select table_name, column_name, data_type, column_default
--   from information_schema.columns
--   where table_schema = 'public'
--     and column_name in ('markings_details', 'marking_notes', 'reported_markings')
--   order by table_name, column_name;
--
-- Expect five rows. Then register an animal with a marking and confirm the
-- JSON actually landed, rather than trusting the UI:
--
--   select name, primary_color, markings, markings_details
--   from animals order by created_at desc limit 5;
