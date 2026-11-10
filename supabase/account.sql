-- Refyne: in-app feedback + "Delete my account".
-- Paste into Supabase → SQL Editor → New query, then Run. Safe to run twice.

-- 1. Feedback from the Settings page. Users can send feedback but can't read anyone's (including their own);
--    you read it in Table Editor → feedback.
create table if not exists public.feedback (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  message     text        not null check (char_length(message) between 1 and 2000),
  app_version int,
  theme       text,
  device      text
);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon;
grant insert on public.feedback to authenticated;
drop policy if exists "feedback: send own" on public.feedback;
create policy "feedback: send own" on public.feedback
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- 2. Delete the signed-in user's account. Their rows in docs, push_subs and push_jobs go with it
--    (on delete cascade); the app removes their photo files from storage before calling this.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from public.docs where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 3. Lets the app check this file has been run before it starts deleting anything.
create or replace function public.account_tools_ready()
returns boolean language sql stable set search_path = '' as $$ select true $$;
revoke all on function public.account_tools_ready() from public, anon;
grant execute on function public.account_tools_ready() to authenticated;
