-- Migration 017: Restrict what reviewers can read
-- 1) Reviewers must not read income columns on user_settings; expose only budget and currency via RPC
-- 2) Finish the owner-only hardening from 014 for notifications and category_budgets
-- 3) Remove anonymous and PUBLIC execute from the reviewer RPCs

-- 1. user_settings: owner-only row access, plus a narrow reviewer RPC
drop policy if exists "budget members can read user_settings" on public.user_settings;
drop policy if exists "owner can read user_settings" on public.user_settings;
create policy "owner can read user_settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create or replace function public.get_candidate_budget_settings(target_owner_id uuid)
returns table (
  monthly_budget numeric,
  default_currency text
)
language sql
security definer
set search_path = public
stable
as $$
  select us.monthly_budget::numeric, us.default_currency::text
  from public.user_settings us
  where us.user_id = target_owner_id
    and (auth.uid() = target_owner_id or public.is_budget_reviewer(target_owner_id));
$$;

-- 2. notifications and category_budgets: owner-only reads
drop policy if exists "budget members can read notifications" on public.notifications;
drop policy if exists "owner can read notifications" on public.notifications;
create policy "owner can read notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "budget members can read category_budgets" on public.category_budgets;
drop policy if exists "owner can read category_budgets" on public.category_budgets;
create policy "owner can read category_budgets"
  on public.category_budgets for select
  using (auth.uid() = user_id);

-- 3. Signed-in users only
revoke execute on function public.add_budget_reviewer_by_email(text) from public, anon;
revoke execute on function public.remove_budget_reviewer(uuid) from public, anon;
revoke execute on function public.get_my_reviewers() from public, anon;
revoke execute on function public.get_my_reviewee_candidates() from public, anon;
revoke execute on function public.get_candidate_budget_settings(uuid) from public, anon;

grant execute on function public.add_budget_reviewer_by_email(text) to authenticated;
grant execute on function public.remove_budget_reviewer(uuid) to authenticated;
grant execute on function public.get_my_reviewers() to authenticated;
grant execute on function public.get_my_reviewee_candidates() to authenticated;
grant execute on function public.get_candidate_budget_settings(uuid) to authenticated;
