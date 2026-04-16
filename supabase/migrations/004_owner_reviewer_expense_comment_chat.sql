-- Patch after 003_shared_budget_roles.sql
-- Enables two-way expense comment chat between owner and reviewer.

do $$
begin
  if to_regclass('public.budget_memberships') is null then
    raise exception 'Missing public.budget_memberships. Apply 003_shared_budget_roles.sql first.';
  end if;
end
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

drop policy if exists "owner can insert expense comments" on public.expense_comments;
drop policy if exists "reviewer can insert expense comments" on public.expense_comments;

create policy "owner can insert expense comments"
on public.expense_comments
for insert
with check (
  author_role = 'owner'
  and public.is_budget_owner_account()
  and exists (
    select 1
    from public.expenses e
    where e.id = public.expense_comments.expense_id
      and e.user_id = auth.uid()
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