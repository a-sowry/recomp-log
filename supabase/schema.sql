-- Recomp Log database setup.
-- Paste this whole file into Supabase → SQL Editor → New query, then press Run. Safe to run twice.

-- 1. One table holds everything: each row is a day of meals, a training session,
--    a weigh-in, a photo record, or your settings.
create table if not exists public.docs (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  collection text        not null check (collection in ('days', 'sessions', 'weights', 'photos', 'config')),
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, collection, id)
);

-- 2. Row-level security: a signed-in user can only see and change their own rows.
--    The public "anon" key in the app can't read anything without your login.
alter table public.docs enable row level security;

-- Only signed-in users can reach the table at all (works whether or not
-- "Automatically expose new tables" was ticked when the project was created).
revoke all on public.docs from anon;
grant select, insert, update, delete on public.docs to authenticated;

drop policy if exists "docs: own rows" on public.docs;
create policy "docs: own rows" on public.docs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 3. Private storage bucket for progress photos (max 10 MB each, images only).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Each user can only read, add or delete files inside their own folder: photos/<their user id>/...
drop policy if exists "photos: read own" on storage.objects;
create policy "photos: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "photos: upload own" on storage.objects;
create policy "photos: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "photos: delete own" on storage.objects;
create policy "photos: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
