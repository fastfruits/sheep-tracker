-- ═══════════════════════════════════════════════════════════════════════════
-- Initial schema — the FINAL state, consolidated.
--
-- This is the source of truth for the local CLI stack (`supabase db reset`).
-- The hand-run files schema.sql / rls.sql / rls-web.sql remain on disk as the
-- history of the hosted project; do not run them against a local stack.
--
-- ── Why one file instead of replaying those three ──────────────────────────
--
-- They contradict each other on purpose. rls.sql creates
-- "animals are publicly readable" and rls-web.sql drops it; schema.sql adds
-- profiles.push_token and rls-web.sql drops it. Replaying that as migration
-- history means every `db reset` passes through a window where every farmer's
-- livestock inventory is world-readable, and leaves a dropped-column hole in
-- the catalog that a fresh build does not have.
--
-- rls.sql also opens with a 40-line `drop policy if exists` prologue. That
-- exists purely as armour for hand-running the file twice. Migrations run once,
-- in order, in a transaction, with a recorded version — carrying the prologue
-- forward would preserve the hazard documented in schema.sql into a place
-- where it can no longer help and can only mislead.
--
-- ── Differences from schema.sql, all deliberate ────────────────────────────
--
--   * profiles.push_token       — omitted; rls-web.sql drops it (native app gone)
--   * comments.user_name        — omitted; verified absent on the hosted project
--                                 (2026-09-02), and app/actions/posts.ts never
--                                 writes it. Declaring it `not null` here would
--                                 make addComment() fail locally but pass in
--                                 production — the worst kind of divergence.
--   * notifications            — the seven detail columns ARE included. They are
--                                 in schema.sql and the app writes all of them,
--                                 but they were never applied to the hosted
--                                 project, so every farmer alert insert has been
--                                 failing there. See fix-notifications-columns.sql.
--
-- Explanatory comments below are kept verbatim from rls.sql where they still
-- apply; they are the best documentation of *why* each policy exists.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Profiles (extends Supabase auth.users) ──────────────────────────────────
create table profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  name        text not null,
  is_farmer   boolean default false,
  farm_name   text,
  created_at  timestamptz default now()
);

-- ── Animals registered by farmers ───────────────────────────────────────────
create table animals (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid references profiles(id) on delete cascade,
  species       text not null,
  name          text not null,
  primary_color text not null,
  markings      text,
  tag_number    text,
  created_at    timestamptz default now()
);

-- ── Posts (sightings + community) ───────────────────────────────────────────
create table posts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references profiles(id) on delete cascade,
  caption          text,
  species          text,
  primary_color    text,
  markings         text,
  location_label   text,
  latitude         double precision,
  longitude        double precision,
  photo_url        text,
  is_sighting      boolean default false,
  sighting_status  text default 'open',
  created_at       timestamptz default now()
);

-- ── Likes ───────────────────────────────────────────────────────────────────
create table likes (
  user_id  uuid references profiles(id) on delete cascade,
  post_id  uuid references posts(id) on delete cascade,
  primary key (user_id, post_id)
);

-- ── Confirmations ("I've seen this too") ────────────────────────────────────
create table confirmations (
  user_id  uuid references profiles(id) on delete cascade,
  post_id  uuid references posts(id) on delete cascade,
  primary key (user_id, post_id)
);

-- ── Comments ────────────────────────────────────────────────────────────────
-- No `user_name` column: the author's name is joined from profiles at read
-- time (see the comment at the top of lib/data/posts.ts).
create table comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid references posts(id) on delete cascade,
  user_id     uuid references profiles(id) on delete cascade,
  text        text not null,
  created_at  timestamptz default now()
);

-- ── Follows ─────────────────────────────────────────────────────────────────
create table follows (
  follower_id   uuid references profiles(id) on delete cascade,
  following_id  uuid references profiles(id) on delete cascade,
  primary key (follower_id, following_id)
);

-- ── Farmer notifications ────────────────────────────────────────────────────
create table notifications (
  id               uuid primary key default gen_random_uuid(),
  farmer_id        uuid references profiles(id) on delete cascade,
  post_id          uuid references posts(id) on delete cascade,
  animal_id        uuid references animals(id) on delete cascade,
  animal_name      text,
  species          text,
  reporter_name    text,
  reporter_caption text,
  location_label   text,
  latitude         double precision,
  longitude        double precision,
  read             boolean default false,
  created_at       timestamptz default now()
);

-- Both getNotifications() and the nav's unread badge filter on farmer_id on
-- every request. Cheap here; a locking operation once the table has rows.
create index notifications_farmer_idx on notifications (farmer_id, created_at desc);

-- ── Storage bucket for photos ───────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- ── Row-level security ──────────────────────────────────────────────────────
-- Enabling RLS with no policy denies all access, which is the safe default:
-- the database is locked until the policies below grant something.

alter table profiles      enable row level security;
alter table animals       enable row level security;
alter table posts         enable row level security;
alter table likes         enable row level security;
alter table confirmations enable row level security;
alter table comments      enable row level security;
alter table follows       enable row level security;
alter table notifications enable row level security;

-- ── Profiles ────────────────────────────────────────────────────────────────
-- Public read: the feed shows author names and /u/<id> is a public page.
--
-- CAVEAT, and it matters for anything added later: RLS filters ROWS, NOT
-- COLUMNS, and the anon key ships in the JS bundle by design. So every column
-- on this table is readable by anyone. This is exactly how push tokens ended
-- up public (see rls-web.sql). Never add a private field here — phone numbers,
-- addresses, notification preferences all belong in their own table with an
-- owner-only policy.
create policy "profiles are publicly readable"
  on profiles for select using (true);

create policy "users insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "users update their own profile"
  on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ── Animals ─────────────────────────────────────────────────────────────────
-- Owner-only read. Matching happens server-side in the report action using the
-- service-role key, so a visitor never needs another farmer's inventory.
create policy "farmers read their own animals"
  on animals for select using (auth.uid() = owner_id);

create policy "farmers manage their own animals"
  on animals for insert with check (auth.uid() = owner_id);

create policy "farmers update their own animals"
  on animals for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "farmers delete their own animals"
  on animals for delete using (auth.uid() = owner_id);

-- ── Posts ───────────────────────────────────────────────────────────────────
create policy "posts are publicly readable"
  on posts for select using (true);

create policy "users create their own posts"
  on posts for insert with check (auth.uid() = user_id);

-- Covers flipping sighting_status on the author's own post.
create policy "authors update their own posts"
  on posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "authors delete their own posts"
  on posts for delete using (auth.uid() = user_id);

-- ── Likes ───────────────────────────────────────────────────────────────────
create policy "likes are publicly readable"
  on likes for select using (true);

create policy "users like as themselves"
  on likes for insert with check (auth.uid() = user_id);

create policy "users remove their own likes"
  on likes for delete using (auth.uid() = user_id);

-- ── Confirmations ───────────────────────────────────────────────────────────
create policy "confirmations are publicly readable"
  on confirmations for select using (true);

create policy "users confirm as themselves"
  on confirmations for insert with check (auth.uid() = user_id);

create policy "users remove their own confirmations"
  on confirmations for delete using (auth.uid() = user_id);

-- ── Comments ────────────────────────────────────────────────────────────────
create policy "comments are publicly readable"
  on comments for select using (true);

create policy "users comment as themselves"
  on comments for insert with check (auth.uid() = user_id);

create policy "users delete their own comments"
  on comments for delete using (auth.uid() = user_id);

-- ── Follows ─────────────────────────────────────────────────────────────────
-- Public read: follower and following counts render on public profiles.
create policy "follows are publicly readable"
  on follows for select using (true);

create policy "users follow as themselves"
  on follows for insert with check (auth.uid() = follower_id);

create policy "users unfollow as themselves"
  on follows for delete using (auth.uid() = follower_id);

-- ── Notifications ───────────────────────────────────────────────────────────
-- Only the recipient may read them; this is the one table with genuinely
-- private content (a reporter's exact coordinates).
create policy "farmers read their own notifications"
  on notifications for select using (auth.uid() = farmer_id);

-- Covers markNotificationsRead().
create policy "farmers update their own notifications"
  on notifications for update using (auth.uid() = farmer_id) with check (auth.uid() = farmer_id);

-- Deliberately NO insert policy. A reporter writes rows addressed to *other*
-- people, so an owner-scoped check is impossible and `with check (true)` would
-- let any account invent an alert with a fake animal, reporter and GPS
-- position. The report action is the only writer, via the service-role key,
-- which bypasses RLS.

-- ── Storage: photos bucket ──────────────────────────────────────────────────
-- Public read (photo_url is rendered directly by <Image>), authenticated write.
create policy "photos are publicly readable"
  on storage.objects for select using (bucket_id = 'photos');

create policy "signed-in users upload photos"
  on storage.objects for insert to authenticated with check (bucket_id = 'photos');

create policy "uploaders update their own photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'photos' and owner = auth.uid());

create policy "uploaders delete their own photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and owner = auth.uid());
