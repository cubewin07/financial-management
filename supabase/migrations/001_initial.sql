create extension if not exists pgcrypto;

create or replace function public.is_owner()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'owner';
$$;

create or replace function public.is_reviewer()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'reviewer';
$$;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  category text not null check (char_length(trim(category)) > 0),
  date date not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_id_date_idx
  on public.expenses (user_id, date desc);

create index if not exists expenses_user_id_category_idx
  on public.expenses (user_id, category);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(trim(label)) > 0),
  amount numeric(10,2) not null check (amount > 0),
  frequency text not null check (frequency in ('weekly', 'monthly')),
  start_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_active_idx
  on public.subscriptions (user_id, active);

create index if not exists subscriptions_user_id_start_date_idx
  on public.subscriptions (user_id, start_date desc);

create table if not exists public.monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  budget numeric(10,2) not null check (budget >= 0),
  total_spent numeric(10,2) not null check (total_spent >= 0),
  carry_over numeric(10,2) not null,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

create index if not exists monthly_snapshots_user_id_month_idx
  on public.monthly_snapshots (user_id, month desc);

create table if not exists public.expense_comments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  author_role text not null check (author_role in ('owner', 'reviewer')),
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists expense_comments_expense_id_created_at_idx
  on public.expense_comments (expense_id, created_at desc);

create table if not exists public.month_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  author_role text not null check (author_role in ('owner', 'reviewer')),
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists month_comments_user_id_month_created_at_idx
  on public.month_comments (user_id, month desc, created_at desc);

alter table public.expenses enable row level security;
alter table public.subscriptions enable row level security;
alter table public.monthly_snapshots enable row level security;
alter table public.expense_comments enable row level security;
alter table public.month_comments enable row level security;

create policy "owner can manage own expenses"
on public.expenses
for all
using (public.is_owner() and auth.uid() = user_id)
with check (public.is_owner() and auth.uid() = user_id);

create policy "reviewer can read expenses"
on public.expenses
for select
using (public.is_reviewer());

create policy "owner can manage own subscriptions"
on public.subscriptions
for all
using (public.is_owner() and auth.uid() = user_id)
with check (public.is_owner() and auth.uid() = user_id);

create policy "owner can manage own monthly snapshots"
on public.monthly_snapshots
for all
using (public.is_owner() and auth.uid() = user_id)
with check (public.is_owner() and auth.uid() = user_id);

create policy "owner can manage expense comments for own expenses"
on public.expense_comments
for all
using (
  public.is_owner()
  and exists (
    select 1
    from public.expenses
    where public.expenses.id = public.expense_comments.expense_id
      and public.expenses.user_id = auth.uid()
  )
)
with check (
  public.is_owner()
  and exists (
    select 1
    from public.expenses
    where public.expenses.id = public.expense_comments.expense_id
      and public.expenses.user_id = auth.uid()
  )
);

create policy "reviewer can add expense comments"
on public.expense_comments
for insert
with check (
  public.is_reviewer()
  and author_role = 'reviewer'
  and exists (
    select 1
    from public.expenses
    where public.expenses.id = public.expense_comments.expense_id
  )
);

create policy "reviewer can read expense comments"
on public.expense_comments
for select
using (
  public.is_reviewer()
  and exists (
    select 1
    from public.expenses
    where public.expenses.id = public.expense_comments.expense_id
  )
);

create policy "owner can manage own month comments"
on public.month_comments
for all
using (public.is_owner() and auth.uid() = user_id)
with check (public.is_owner() and auth.uid() = user_id);

create policy "reviewer can add month comments"
on public.month_comments
for insert
with check (public.is_reviewer() and author_role = 'reviewer');

create policy "reviewer can read month comments"
on public.month_comments
for select
using (public.is_reviewer());

alter publication supabase_realtime add table public.expense_comments;
alter publication supabase_realtime add table public.month_comments;

