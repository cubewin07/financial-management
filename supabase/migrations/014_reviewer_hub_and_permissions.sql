-- Migration 014: Reviewer Hub & Role-Based Financial Reports Architecture
-- 1) Remove 1:1 delegate constraint to allow many-to-many reviewing
-- 2) Remove legacy 'viewer' role; standardize on 'reviewer'
-- 3) Ensure is_budget_owner_account() preserves account autonomy for all registered users
-- 4) Harden sensitive tables (accounts, investments, savings_goals, etc.) to owner-only
-- 5) Add RPC helper functions for email-based reviewer addition, removal, and candidate listing

-- 1. Update budget_memberships constraints
alter table public.budget_memberships
  drop constraint if exists budget_memberships_member_user_id_key;

update public.budget_memberships
  set role = 'reviewer'
  where role = 'viewer';

alter table public.budget_memberships
  drop constraint if exists budget_memberships_role_check;

alter table public.budget_memberships
  add constraint budget_memberships_role_check
  check (role = 'reviewer');

-- 2. Preserve User Autonomy: Every registered user is always owner of their own records
create or replace function public.is_budget_owner_account()
returns boolean
language sql
stable
as $$
  select true;
$$;

-- Helper predicates
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

-- 3. Harden sensitive financial tables to owner-only
-- accounts
drop policy if exists "budget members can read accounts" on public.accounts;
drop policy if exists "owner can read accounts" on public.accounts;
create policy "owner can read accounts"
  on public.accounts for select
  using (auth.uid() = user_id);

-- savings_goals
drop policy if exists "budget members can read savings_goals" on public.savings_goals;
drop policy if exists "owner can read savings_goals" on public.savings_goals;
create policy "owner can read savings_goals"
  on public.savings_goals for select
  using (auth.uid() = user_id);

-- investments
drop policy if exists "budget members can read investments" on public.investments;
drop policy if exists "owner can read investments" on public.investments;
create policy "owner can read investments"
  on public.investments for select
  using (auth.uid() = user_id);

-- user_income_sources
drop policy if exists "budget members can read user_income_sources" on public.user_income_sources;
drop policy if exists "owner can read user_income_sources" on public.user_income_sources;
create policy "owner can read user_income_sources"
  on public.user_income_sources for select
  using (auth.uid() = user_id);

-- receipt_queue
drop policy if exists "budget members can read receipt_queue" on public.receipt_queue;
drop policy if exists "owner can read receipt_queue" on public.receipt_queue;
create policy "owner can read receipt_queue"
  on public.receipt_queue for select
  using (auth.uid() = user_id);

-- 4. RPC: Add reviewer by email
create or replace function public.add_budget_reviewer_by_email(reviewer_email text)
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
  clean_email text;
begin
  clean_email := lower(trim(reviewer_email));

  if clean_email = '' or clean_email is null then
    return json_build_object('success', false, 'message', 'Please provide a valid email address.');
  end if;

  select id into target_user_id
  from auth.users
  where lower(email) = clean_email;

  if target_user_id is null then
    return json_build_object(
      'success', false,
      'message', 'No registered account found with this email. Please ask them to sign up for an account first.'
    );
  end if;

  if target_user_id = auth.uid() then
    return json_build_object('success', false, 'message', 'You cannot add yourself as a reviewer.');
  end if;

  insert into public.budget_memberships (owner_user_id, member_user_id, role)
  values (auth.uid(), target_user_id, 'reviewer')
  on conflict (owner_user_id, member_user_id)
  do update set role = 'reviewer';

  return json_build_object(
    'success', true,
    'message', 'Reviewer added successfully.',
    'member_user_id', target_user_id
  );
end;
$$;

-- 5. RPC: Remove budget reviewer
create or replace function public.remove_budget_reviewer(target_member_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.budget_memberships
  where owner_user_id = auth.uid()
    and member_user_id = target_member_user_id;

  return json_build_object('success', true, 'message', 'Reviewer removed.');
end;
$$;

-- 6. RPC: Get current user's reviewers (I am the owner)
create or replace function public.get_my_reviewers()
returns table (
  member_user_id uuid,
  member_email text,
  role text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, auth
stable
as $$
  select
    bm.member_user_id,
    u.email::text as member_email,
    bm.role,
    bm.created_at
  from public.budget_memberships bm
  join auth.users u on u.id = bm.member_user_id
  where bm.owner_user_id = auth.uid()
  order by bm.created_at desc;
$$;

-- 7. RPC: Get candidate budgets I am allowed to review (I am the reviewer)
create or replace function public.get_my_reviewee_candidates()
returns table (
  owner_user_id uuid,
  owner_email text,
  role text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, auth
stable
as $$
  select
    bm.owner_user_id,
    u.email::text as owner_email,
    bm.role,
    bm.created_at
  from public.budget_memberships bm
  join auth.users u on u.id = bm.owner_user_id
  where bm.member_user_id = auth.uid()
  order by bm.created_at desc;
$$;

grant execute on function public.add_budget_reviewer_by_email to authenticated;
grant execute on function public.remove_budget_reviewer to authenticated;
grant execute on function public.get_my_reviewers to authenticated;
grant execute on function public.get_my_reviewee_candidates to authenticated;
