-- ── Profiles (extends Supabase auth.users) ──────────────────────────────────
create table if not exists profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  name        text not null,
  is_farmer   boolean default false,
  farm_name   text,
  push_token  text,
  created_at  timestamptz default now()
);

-- Add push_token if running against an existing schema
alter table profiles add column if not exists push_token text;

-- ── Animals registered by farmers ───────────────────────────────────────────
create table if not exists animals (
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
create table if not exists posts (
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
create table if not exists likes (
  user_id  uuid references profiles(id) on delete cascade,
  post_id  uuid references posts(id) on delete cascade,
  primary key (user_id, post_id)
);

-- ── Confirmations ("I've seen this too") ────────────────────────────────────
create table if not exists confirmations (
  user_id  uuid references profiles(id) on delete cascade,
  post_id  uuid references posts(id) on delete cascade,
  primary key (user_id, post_id)
);

-- ── Comments ────────────────────────────────────────────────────────────────
create table if not exists comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid references posts(id) on delete cascade,
  user_id     uuid references profiles(id) on delete cascade,
  user_name   text not null,
  text        text not null,
  created_at  timestamptz default now()
);

-- ── Follows ─────────────────────────────────────────────────────────────────
create table if not exists follows (
  follower_id   uuid references profiles(id) on delete cascade,
  following_id  uuid references profiles(id) on delete cascade,
  primary key (follower_id, following_id)
);

-- ── Farmer notifications ─────────────────────────────────────────────────────
create table if not exists notifications (
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

-- ── Storage bucket for photos ────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- ── Row-level security (permissive for prototype) ────────────────────────────
alter table profiles      enable row level security;
alter table animals       enable row level security;
alter table posts         enable row level security;
alter table likes         enable row level security;
alter table confirmations enable row level security;
alter table comments      enable row level security;
alter table follows       enable row level security;
alter table notifications enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles'      and policyname='open') then
    create policy "open" on profiles      for all using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where tablename='animals'       and policyname='open') then
    create policy "open" on animals       for all using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where tablename='posts'         and policyname='open') then
    create policy "open" on posts         for all using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where tablename='likes'         and policyname='open') then
    create policy "open" on likes         for all using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where tablename='confirmations' and policyname='open') then
    create policy "open" on confirmations for all using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where tablename='comments'      and policyname='open') then
    create policy "open" on comments      for all using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where tablename='follows'       and policyname='open') then
    create policy "open" on follows       for all using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where tablename='notifications' and policyname='open') then
    create policy "open" on notifications for all using (true) with check (true); end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='open'
  ) then
    create policy "open" on storage.objects for all
      using (bucket_id = 'photos') with check (bucket_id = 'photos');
  end if;
end $$;
