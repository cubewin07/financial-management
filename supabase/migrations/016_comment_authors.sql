-- Migration 016: Comment Authors Attribution & Display
-- Adds author_user_id and author_email to expense_comments and month_comments
-- Allows owners to see which reviewer authored each comment or advice note.

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

-- 3. Backfill author_email for existing rows where possible
-- If the reviewer is the only reviewer for that target, we leave existing as null or backfill if member exists
update public.month_comments mc
set author_email = u.email
from auth.users u
where mc.author_user_id is not null
  and mc.author_email is null
  and u.id = mc.author_user_id;

update public.expense_comments ec
set author_email = u.email
from auth.users u
where ec.author_user_id is not null
  and ec.author_email is null
  and u.id = ec.author_user_id;
