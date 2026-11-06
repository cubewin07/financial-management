-- Migration 016: Comment Authors Attribution & Display
-- Adds author_user_id and author_email to expense_comments and month_comments
-- Enforces spoof-proof attribution via trigger and allows owners to see which reviewer authored each comment.

-- 1. Alter public.expense_comments
alter table public.expense_comments
  add column if not exists author_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  add column if not exists author_email text default (auth.jwt() ->> 'email');

create index if not exists expense_comments_author_user_id_idx
  on public.expense_comments (author_user_id);

-- 2. Alter public.month_comments
alter table public.month_comments
  add column if not exists author_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  add column if not exists author_email text default (auth.jwt() ->> 'email');

create index if not exists month_comments_author_user_id_idx
  on public.month_comments (author_user_id);

-- 3. Spoof-proof Trigger: Enforces author attribution from the authenticated JWT session context
create or replace function public.set_comment_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.author_user_id := auth.uid();
      new.author_email := coalesce(auth.jwt() ->> 'email', new.author_email);
    end if;
  elsif tg_op = 'UPDATE' and auth.uid() is not null then
    -- Preserve original author attribution when an authenticated client updates a row.
    -- Skipped for service/migration contexts (auth.uid() is null) so the backfill below can run.
    new.author_user_id := old.author_user_id;
    new.author_email := old.author_email;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_expense_comment_author on public.expense_comments;
create trigger trg_set_expense_comment_author
before insert or update on public.expense_comments
for each row execute function public.set_comment_author();

drop trigger if exists trg_set_month_comment_author on public.month_comments;
create trigger trg_set_month_comment_author
before insert or update on public.month_comments
for each row execute function public.set_comment_author();

-- 4. Backfill author_user_id and author_email for existing rows where possible
-- 4a. Backfill reviewer comments where a single reviewer exists for that budget owner
update public.month_comments mc
set author_user_id = bm.member_user_id,
    author_email = u.email
from public.budget_memberships bm
join auth.users u on u.id = bm.member_user_id
where mc.author_user_id is null
  and mc.author_role = 'reviewer'
  and bm.owner_user_id = mc.user_id
  and bm.role = 'reviewer'
  and (
    select count(*) from public.budget_memberships bm2
    where bm2.owner_user_id = mc.user_id and bm2.role = 'reviewer'
  ) = 1;

update public.expense_comments ec
set author_user_id = bm.member_user_id,
    author_email = u.email
from public.expenses e
join public.budget_memberships bm on bm.owner_user_id = e.user_id
join auth.users u on u.id = bm.member_user_id
where ec.author_user_id is null
  and ec.author_role = 'reviewer'
  and e.id = ec.expense_id
  and bm.role = 'reviewer'
  and (
    select count(*) from public.budget_memberships bm2
    where bm2.owner_user_id = e.user_id and bm2.role = 'reviewer'
  ) = 1;

-- 4b. Backfill owner comments
update public.month_comments mc
set author_user_id = mc.user_id,
    author_email = u.email
from auth.users u
where mc.author_user_id is null
  and mc.author_role = 'owner'
  and u.id = mc.user_id;

update public.expense_comments ec
set author_user_id = e.user_id,
    author_email = u.email
from public.expenses e
join auth.users u on u.id = e.user_id
where ec.author_user_id is null
  and ec.author_role = 'owner'
  and e.id = ec.expense_id;
