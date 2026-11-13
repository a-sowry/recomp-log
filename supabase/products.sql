-- Refyne: shared products that users add from a packet's nutrition label.
-- Anyone signed in can search them and add new ones; nobody can edit or delete someone else's.
-- Paste into Supabase → SQL Editor → New query, then Run. Safe to run twice.

create extension if not exists pg_trgm with schema extensions;

create table if not exists public.products (
  id          uuid        primary key default gen_random_uuid(),
  barcode     text        unique check (barcode is null or barcode ~ '^[0-9]{6,14}$'),
  name        text        not null check (char_length(name) between 1 and 120),
  brand       text        not null default '' check (char_length(brand) <= 80),
  serving_g   numeric     check (serving_g is null or (serving_g > 0 and serving_g <= 2000)),
  unit_label  text        check (unit_label is null or char_length(unit_label) <= 40),
  kcal        numeric     not null check (kcal between 0 and 950),   -- all nutrition values are per 100 g (or 100 ml)
  p           numeric     not null check (p between 0 and 100),
  c           numeric     not null check (c between 0 and 100),
  f           numeric     not null check (f between 0 and 100),
  sugars      numeric     check (sugars is null or sugars between 0 and 100),
  sat_fat     numeric     check (sat_fat is null or sat_fat between 0 and 100),
  sodium_mg   numeric     check (sodium_mg is null or sodium_mg between 0 and 40000),
  created_by  uuid        default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  hidden      boolean     not null default false,   -- set true in Table Editor to pull a bad entry
  search      text        generated always as (lower(name || ' ' || brand)) stored
);
create index if not exists products_search_trgm on public.products using gin (search extensions.gin_trgm_ops);

alter table public.products enable row level security;
revoke all on public.products from anon;
grant select, insert on public.products to authenticated;
drop policy if exists "products: read visible" on public.products;
create policy "products: read visible" on public.products
  for select to authenticated using (not hidden);
drop policy if exists "products: add own" on public.products;
create policy "products: add own" on public.products
  for insert to authenticated with check (created_by = (select auth.uid()) and hidden = false);

-- "Report wrong info" from the app. You read these in Table Editor → product_reports.
create table if not exists public.product_reports (
  id          uuid        primary key default gen_random_uuid(),
  product_id  uuid        not null references public.products (id) on delete cascade,
  user_id     uuid        default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.product_reports enable row level security;
revoke all on public.product_reports from anon;
grant insert on public.product_reports to authenticated;
drop policy if exists "reports: send own" on public.product_reports;
create policy "reports: send own" on public.product_reports
  for insert to authenticated with check (user_id = (select auth.uid()));
