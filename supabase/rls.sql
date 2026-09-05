-- ═══════════════════════════════════════════════════════════════════════════
-- NOTE: hand-run file for the HOSTED project. The local CLI stack gets its
-- policies from supabase/migrations/ instead, which carries only the final
-- set (i.e. after rls-web.sql's tightening pass). Running this file against a
-- local stack would restore the loose `animals` and `notifications` policies
-- that rls-web.sql exists to remove.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- Row-level security policies for SheepFinder.
--
-- Replaces the prototype `create policy "open" ... for all using (true)` rules
-- in schema.sql. Those were survivable for a native app; on a public website
-- the anon key ships inside a JS bundle that anyone can read, so `using (true)`
-- means any visitor can read, edit or delete every row in the database.
--
-- Run this AFTER schema.sql, against the same project:
--   supabase db execute --file supabase/rls.sql
-- or paste it into the Supabase SQL editor.
--
-- Note: writes now require an authenticated user. The `user_id: 'guest'`
-- fallback in store/app-store.tsx was already non-functional (it is not a uuid
-- and violates the foreign key), so this does not remove working behaviour —
-- but anonymous reporting is not possible without a further design change.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Drop the permissive prototype policies ──────────────────────────────────
-- ...and this file's own policies, so it is safe to re-run. Without these,
-- a second run fails halfway with "policy already exists", leaving the
-- database in a partially-applied state.
drop policy if exists "open" on profiles;
drop policy if exists "open" on animals;
drop policy if exists "open" on posts;
drop policy if exists "open" on likes;
drop policy if exists "open" on confirmations;
drop policy if exists "open" on comments;
drop policy if exists "open" on follows;
drop policy if exists "open" on notifications;
drop policy if exists "open" on storage.objects;

drop policy if exists "profiles are publicly readable" on profiles;
drop policy if exists "users insert their own profile" on profiles;
drop policy if exists "users update their own profile" on profiles;
drop policy if exists "animals are publicly readable" on animals;
drop policy if exists "farmers manage their own animals" on animals;
drop policy if exists "farmers update their own animals" on animals;
drop policy if exists "farmers delete their own animals" on animals;
drop policy if exists "posts are publicly readable" on posts;
drop policy if exists "users create their own posts" on posts;
drop policy if exists "authors update their own posts" on posts;
drop policy if exists "authors delete their own posts" on posts;
drop policy if exists "likes are publicly readable" on likes;
drop policy if exists "users like as themselves" on likes;
drop policy if exists "users remove their own likes" on likes;
drop policy if exists "confirmations are publicly readable" on confirmations;
drop policy if exists "users confirm as themselves" on confirmations;
drop policy if exists "users remove their own confirmations" on confirmations;
drop policy if exists "comments are publicly readable" on comments;
drop policy if exists "users comment as themselves" on comments;
drop policy if exists "users delete their own comments" on comments;
drop policy if exists "follows are publicly readable" on follows;
drop policy if exists "users follow as themselves" on follows;
drop policy if exists "users unfollow as themselves" on follows;
drop policy if exists "farmers read their own notifications" on notifications;
drop policy if exists "signed-in users create notifications" on notifications;
drop policy if exists "farmers update their own notifications" on notifications;
drop policy if exists "photos are publicly readable" on storage.objects;
drop policy if exists "signed-in users upload photos" on storage.objects;
drop policy if exists "uploaders update their own photos" on storage.objects;
drop policy if exists "uploaders delete their own photos" on storage.objects;

alter table profiles      enable row level security;
alter table animals       enable row level security;
alter table posts         enable row level security;
alter table likes         enable row level security;
alter table confirmations enable row level security;
alter table comments      enable row level security;
alter table follows       enable row level security;
alter table notifications enable row level security;

-- ── Profiles ────────────────────────────────────────────────────────────────
-- Public read: the feed shows author names and /profile/<id> is a public page.
--
-- CAVEAT: this also exposes `profiles.push_token`, because loadProfile() does
-- `select('*')` and submitSighting() reads other users' tokens to send pushes
-- client-side. The proper fix is to move sending into a Supabase Edge Function
-- and then `revoke select (push_token) on profiles from anon, authenticated`.
-- Until then, treat push tokens as public.
create policy "profiles are publicly readable"
  on profiles for select using (true);

create policy "users insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "users update their own profile"
  on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ── Animals ─────────────────────────────────────────────────────────────────
-- Public read is required by the current matching design: loadAnimals() pulls
-- every registered animal to the client and matches sightings locally. Moving
-- that match server-side would let this be restricted to the owner.
create policy "animals are publicly readable"
  on animals for select using (true);

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

-- Covers markReunited(), which flips sighting_status on the author's own post.
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
-- Public read: loadFollowGraph() fetches the whole graph to render follower
-- and following counts on public profiles.
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

-- Any signed-in user may create one: reporting a sighting writes notification
-- rows addressed to the matched farmers, not to the reporter.
create policy "signed-in users create notifications"
  on notifications for insert to authenticated with check (true);

-- Covers markNotificationsRead().
create policy "farmers update their own notifications"
  on notifications for update using (auth.uid() = farmer_id) with check (auth.uid() = farmer_id);

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
