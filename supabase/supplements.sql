-- Refyne: shared supplements that users add from the label (amounts per tablet / scoop / serve).
-- Anyone signed in can look them up by barcode and add new ones; nobody can edit or delete someone else's.
-- Paste into Supabase → SQL Editor → New query, then Run. Safe to run twice.

create table if not exists public.supplements (
  id          uuid        primary key default gen_random_uuid(),
  barcode     text        unique check (barcode is null or barcode ~ '^[0-9]{6,14}$'),
  name        text        not null check (char_length(name) between 1 and 120),
  brand       text        not null default '' check (char_length(brand) <= 80),
  dose_label  text        check (dose_label is null or char_length(dose_label) <= 40),
  nut         jsonb       not null default '{}'::jsonb check (jsonb_typeof(nut) = 'object' and octet_length(nut::text) <= 2000),
  created_by  uuid        default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  hidden      boolean     not null default false   -- set true in Table Editor to pull a bad entry
);
alter table public.supplements enable row level security;
revoke all on public.supplements from anon;
grant select, insert on public.supplements to authenticated;
drop policy if exists "supplements: read visible" on public.supplements;
create policy "supplements: read visible" on public.supplements
  for select to authenticated using (not hidden);
drop policy if exists "supplements: add own" on public.supplements;
create policy "supplements: add own" on public.supplements
  for insert to authenticated with check (created_by = (select auth.uid()) and hidden = false);
