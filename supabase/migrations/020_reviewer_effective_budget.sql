-- Migration 020: Expose owner's current-month carry-over budget allocation to reviewers
-- Keeps income and carry_over reserve balance private while allowing reviewer views
-- to compute the same effective monthly budget as the owner dashboard.

drop function if exists public.get_candidate_budget_settings(uuid);

create function public.get_candidate_budget_settings(target_owner_id uuid)
returns table (
  monthly_budget numeric,
  default_currency text,
  carry_over_allocated numeric,
  carry_over_allocated_month text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    us.monthly_budget::numeric,
    us.default_currency::text,
    us.carry_over_allocated::numeric,
    us.carry_over_allocated_month::text
  from public.user_settings us
  where us.user_id = target_owner_id
    and (auth.uid() = target_owner_id or public.is_budget_reviewer(target_owner_id));
$$;

revoke execute on function public.get_candidate_budget_settings(uuid) from public, anon;
grant execute on function public.get_candidate_budget_settings(uuid) to authenticated;
