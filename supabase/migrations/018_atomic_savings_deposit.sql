-- Migration 018: Atomic savings deposits
-- Adds to the stored balance in one statement, so deposits from two devices cannot overwrite each other.
-- Runs as the caller, so existing row level security still applies, and also checks ownership explicitly.

create or replace function public.add_savings_goal_deposit(goal_id bigint, deposit_amount numeric)
returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_total numeric;
begin
  if deposit_amount is null or deposit_amount <= 0 then
    raise exception 'Deposit amount must be greater than zero' using errcode = '22023';
  end if;

  update public.savings_goals
  set current_amount = current_amount + deposit_amount
  where id = goal_id
    and user_id = auth.uid()
  returning current_amount into new_total;

  if new_total is null then
    raise exception 'Savings goal not found' using errcode = 'P0002';
  end if;

  return new_total;
end;
$$;

revoke execute on function public.add_savings_goal_deposit(bigint, numeric) from public, anon;
grant execute on function public.add_savings_goal_deposit(bigint, numeric) to authenticated;
