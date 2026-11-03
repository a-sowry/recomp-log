-- Recomp Log: rest-timer notifications.
-- Paste into Supabase → SQL Editor → New query and press Run. Safe to run more than once.
-- Replace CRON_SECRET_HERE with the same secret you saved as the CRON_SECRET edge function secret.

-- 1. Which phones want notifications (one row per phone), and which notifications are waiting to go out.
create table if not exists public.push_subs (
  endpoint   text primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.push_jobs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  send_at    timestamptz not null,
  title      text not null,
  body       text not null,
  tag        text not null default 'rest',
  created_at timestamptz not null default now()
);
create index if not exists push_jobs_send_at on public.push_jobs (send_at);
create index if not exists push_subs_user on public.push_subs (user_id);

-- 2. Each signed-in user can only see and change their own rows.
alter table public.push_subs enable row level security;
alter table public.push_jobs enable row level security;
revoke all on public.push_subs, public.push_jobs from anon;
grant select, insert, update, delete on public.push_subs, public.push_jobs to authenticated;
drop policy if exists "push_subs: own" on public.push_subs;
create policy "push_subs: own" on public.push_subs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "push_jobs: own" on public.push_jobs;
create policy "push_jobs: own" on public.push_jobs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 3. Every 3 seconds, if a notification is due, call the send-push function.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create or replace function public.kick_push_sender() returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.push_jobs where send_at <= now() + interval '3 seconds') then
    perform net.http_post(
      url := 'https://upbnevpetfbalytrgbuo.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'CRON_SECRET_HERE'),
      body := '{}'::jsonb
    );
  end if;
end $$;
revoke execute on function public.kick_push_sender() from public, anon, authenticated;

select cron.schedule('recomp-push-sender', '3 seconds', $$select public.kick_push_sender()$$);
