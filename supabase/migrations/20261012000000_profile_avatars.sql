-- ═══════════════════════════════════════════════════════════════════════════
-- Profile pictures.
--
-- Adds `profiles.avatar_url` and a public `avatars` bucket. Users without a
-- picture keep the colored initial, so no backfill is needed.
--
-- ── Why a separate bucket from `photos` ────────────────────────────────────
--
-- `photos` lets any signed-in user insert anywhere in the bucket. Avatars are
-- stored under `<user id>/…`, and the policies below pin writes to the
-- caller's own folder, so one account can't overwrite another's picture even
-- by guessing the path.
-- ═══════════════════════════════════════════════════════════════════════════

alter table profiles add column if not exists avatar_url text;

-- 2 MB cap and image types enforced by Storage itself, not just the app.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars are publicly readable"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "users upload to their own avatar folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users update their own avatars"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete their own avatars"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
