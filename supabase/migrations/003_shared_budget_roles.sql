-- Shared budget model with three roles:
-- 1) owner   : full CRUD on budget rows
-- 2) reviewer: read budget rows + insert review comments
-- 3) viewer  : read-only
--
-- This migration replaces strict per-user ownership policies from 002.

-- Membership table: links non-owner accounts (reviewer/viewer) to an owner budget.
create table if not exists public.budget_memberships (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  member_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('reviewer', 'viewer')),
  created_at timestamptz not null default now(),
  unique (owner_user_id, member_user_id),
  unique (member_user_id),
  check (owner_user_id <> member_user_id)
);

create index if not exists budget_memberships_owner_idx
  on public.budget_memberships (owner_user_id);

create index if not exists budget_memberships_member_idx
  on public.budget_memberships (member_user_id);

alter table public.budget_memberships enable row level security;

drop policy if exists "owner can manage budget members" on public.budget_memberships;
drop policy if exists "member can read own budget link" on public.budget_memberships;

create policy "owner can manage budget members"
on public.budget_memberships
for all
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "member can read own budget link"
on public.budget_memberships
for select
using (auth.uid() = member_user_id);

-- Helper predicates used by table policies.
create or replace function public.can_access_owner_budget(target_owner_id uuid)
returns boolean
language sql
stable
as $$
  select
    auth.uid() = target_owner_id
    or exists (
      select 1
      from public.budget_memberships bm
      where bm.owner_user_id = target_owner_id
        and bm.member_user_id = auth.uid()
    );
$$;

create or replace function public.is_budget_reviewer(target_owner_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.budget_memberships bm
    where bm.owner_user_id = target_owner_id
      and bm.member_user_id = auth.uid()
      and bm.role = 'reviewer'
  );
$$;

create or replace function public.is_budget_owner_account()
returns boolean
language sql
stable
as $$
  select not exists (
    select 1
    from public.budget_memberships bm
    where bm.member_user_id = auth.uid()
  );
$$;

-- Recreate all policies to move from per-user isolation to shared-budget access.
drop policy if exists "users can manage own expenses" on public.expenses;
drop policy if exists "owner can manage own expenses" on public.expenses;
drop policy if exists "reviewer can read expenses" on public.expenses;
drop policy if exists "budget members can read expenses" on public.expenses;
drop policy if exists "owner can insert expenses" on public.expenses;
drop policy if exists "owner can update expenses" on public.expenses;
drop policy if exists "owner can delete expenses" on public.expenses;

create policy "budget members can read expenses"
on public.expenses
for select
using (public.can_access_owner_budget(user_id));

create policy "owner can insert expenses"
on public.expenses
for insert
with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can update expenses"
on public.expenses
for update
using (auth.uid() = user_id and public.is_budget_owner_account())
with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can delete expenses"
on public.expenses
for delete
using (auth.uid() = user_id and public.is_budget_owner_account());

drop policy if exists "users can manage own subscriptions" on public.subscriptions;
drop policy if exists "owner can manage own subscriptions" on public.subscriptions;
drop policy if exists "budget members can read subscriptions" on public.subscriptions;
drop policy if exists "owner can insert subscriptions" on public.subscriptions;
drop policy if exists "owner can update subscriptions" on public.subscriptions;
drop policy if exists "owner can delete subscriptions" on public.subscriptions;

create policy "budget members can read subscriptions"
on public.subscriptions
for select
using (public.can_access_owner_budget(user_id));

create policy "owner can insert subscriptions"
on public.subscriptions
for insert
with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can update subscriptions"
on public.subscriptions
for update
using (auth.uid() = user_id and public.is_budget_owner_account())
with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can delete subscriptions"
on public.subscriptions
for delete
using (auth.uid() = user_id and public.is_budget_owner_account());

drop policy if exists "users can manage own monthly snapshots" on public.monthly_snapshots;
drop policy if exists "owner can manage own monthly snapshots" on public.monthly_snapshots;
drop policy if exists "budget members can read monthly snapshots" on public.monthly_snapshots;
drop policy if exists "owner can insert monthly snapshots" on public.monthly_snapshots;
drop policy if exists "owner can update monthly snapshots" on public.monthly_snapshots;
drop policy if exists "owner can delete monthly snapshots" on public.monthly_snapshots;

create policy "budget members can read monthly snapshots"
on public.monthly_snapshots
for select
using (public.can_access_owner_budget(user_id));

create policy "owner can insert monthly snapshots"
on public.monthly_snapshots
for insert
with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can update monthly snapshots"
on public.monthly_snapshots
for update
using (auth.uid() = user_id and public.is_budget_owner_account())
with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can delete monthly snapshots"
on public.monthly_snapshots
for delete
using (auth.uid() = user_id and public.is_budget_owner_account());

drop policy if exists "users can manage comments for own expenses" on public.expense_comments;
drop policy if exists "owner can manage expense comments for own expenses" on public.expense_comments;
drop policy if exists "reviewer can add expense comments" on public.expense_comments;
drop policy if exists "reviewer can read expense comments" on public.expense_comments;
drop policy if exists "budget members can read expense comments" on public.expense_comments;
drop policy if exists "reviewer can insert expense comments" on public.expense_comments;
drop policy if exists "owner can delete expense comments" on public.expense_comments;

create policy "budget members can read expense comments"
on public.expense_comments
for select
using (
  exists (
    select 1
    from public.expenses e
    where e.id = public.expense_comments.expense_id
      and public.can_access_owner_budget(e.user_id)
  )
);

create policy "reviewer can insert expense comments"
on public.expense_comments
for insert
with check (
  author_role = 'reviewer'
  and exists (
    select 1
    from public.expenses e
    where e.id = public.expense_comments.expense_id
      and public.is_budget_reviewer(e.user_id)
  )
);

create policy "owner can delete expense comments"
on public.expense_comments
for delete
using (
  public.is_budget_owner_account()
  and
  exists (
    select 1
    from public.expenses e
    where e.id = public.expense_comments.expense_id
      and e.user_id = auth.uid()
  )
);

drop policy if exists "users can manage own month comments" on public.month_comments;
drop policy if exists "owner can manage own month comments" on public.month_comments;
drop policy if exists "reviewer can add month comments" on public.month_comments;
drop policy if exists "reviewer can read month comments" on public.month_comments;
drop policy if exists "budget members can read month comments" on public.month_comments;
drop policy if exists "reviewer can insert month comments" on public.month_comments;
drop policy if exists "owner can delete month comments" on public.month_comments;

create policy "budget members can read month comments"
on public.month_comments
for select
using (public.can_access_owner_budget(user_id));

create policy "reviewer can insert month comments"
on public.month_comments
for insert
with check (
  author_role = 'reviewer'
  and public.is_budget_reviewer(user_id)
);

create policy "owner can delete month comments"
on public.month_comments
for delete
using (auth.uid() = user_id and public.is_budget_owner_account());

-- Ensure RLS is enabled on existing tables.
alter table public.expenses enable row level security;
alter table public.subscriptions enable row level security;
alter table public.monthly_snapshots enable row level security;
alter table public.expense_comments enable row level security;
alter table public.month_comments enable row level security;

-- Next step after migration:
-- Insert memberships for your shared budget.
-- Example:
-- insert into public.budget_memberships (owner_user_id, member_user_id, role)
-- values
--   ('<your-owner-user-uuid>', '<dad-user-uuid>', 'reviewer'),
--   ('<your-owner-user-uuid>', '<viewer-user-uuid>', 'viewer');