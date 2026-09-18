-- Migration: 005_finance_feature_foundation.sql
-- Additive features: user_settings, accounts, savings_goals, investments, category_budgets
-- Additive subscription metadata

-- 1. user_settings
create table if not exists public.user_settings (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    monthly_budget numeric(12,2) not null default 150,
    yearly_savings_goal numeric(12,2) check (yearly_savings_goal >= 0),
    budget_impact_target numeric(5,2) not null default 35 check (budget_impact_target >= 0),
    default_currency char(3) not null default 'USD',
    is_pro_member boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id)
);

-- 2. accounts
create table if not exists public.accounts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    balance numeric(12,2) not null default 0,
    kind text not null check (kind in ('checking', 'savings', 'cash', 'credit', 'other')),
    currency char(3) not null default 'USD',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (balance >= 0 or kind = 'credit')
);

-- 3. savings_goals
create table if not exists public.savings_goals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    target_amount numeric(12,2) not null check (target_amount > 0),
    current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
    currency char(3) not null default 'USD',
    deadline_date date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 4. investments
create table if not exists public.investments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    symbol text,
    units numeric(18,6) not null default 0 check (units >= 0),
    market_value numeric(12,2) not null default 0 check (market_value >= 0),
    currency char(3) not null default 'USD',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 5. category_budgets
create table if not exists public.category_budgets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    category text not null,
    monthly_limit numeric(12,2) not null check (monthly_limit >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, category)
);

-- 6. Additive subscription metadata
alter table public.subscriptions
  add column if not exists service_key text,
  add column if not exists plan_tier text,
  add column if not exists currency char(3) not null default 'USD',
  add column if not exists category text,
  add column if not exists remind_days_before integer check (remind_days_before >= 0 and remind_days_before <= 30);

-- RLS policies

-- user_settings
alter table public.user_settings enable row level security;
drop policy if exists "budget members can read user_settings" on public.user_settings;
drop policy if exists "owner can insert user_settings" on public.user_settings;
drop policy if exists "owner can update user_settings" on public.user_settings;
drop policy if exists "owner can delete user_settings" on public.user_settings;

create policy "budget members can read user_settings"
on public.user_settings for select using (public.can_access_owner_budget(user_id));

create policy "owner can insert user_settings"
on public.user_settings for insert with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can update user_settings"
on public.user_settings for update using (auth.uid() = user_id and public.is_budget_owner_account()) with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can delete user_settings"
on public.user_settings for delete using (auth.uid() = user_id and public.is_budget_owner_account());

-- accounts
alter table public.accounts enable row level security;
drop policy if exists "budget members can read accounts" on public.accounts;
drop policy if exists "owner can insert accounts" on public.accounts;
drop policy if exists "owner can update accounts" on public.accounts;
drop policy if exists "owner can delete accounts" on public.accounts;

create policy "budget members can read accounts"
on public.accounts for select using (public.can_access_owner_budget(user_id));

create policy "owner can insert accounts"
on public.accounts for insert with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can update accounts"
on public.accounts for update using (auth.uid() = user_id and public.is_budget_owner_account()) with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can delete accounts"
on public.accounts for delete using (auth.uid() = user_id and public.is_budget_owner_account());

-- savings_goals
alter table public.savings_goals enable row level security;
drop policy if exists "budget members can read savings_goals" on public.savings_goals;
drop policy if exists "owner can insert savings_goals" on public.savings_goals;
drop policy if exists "owner can update savings_goals" on public.savings_goals;
drop policy if exists "owner can delete savings_goals" on public.savings_goals;

create policy "budget members can read savings_goals"
on public.savings_goals for select using (public.can_access_owner_budget(user_id));

create policy "owner can insert savings_goals"
on public.savings_goals for insert with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can update savings_goals"
on public.savings_goals for update using (auth.uid() = user_id and public.is_budget_owner_account()) with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can delete savings_goals"
on public.savings_goals for delete using (auth.uid() = user_id and public.is_budget_owner_account());

-- investments
alter table public.investments enable row level security;
drop policy if exists "budget members can read investments" on public.investments;
drop policy if exists "owner can insert investments" on public.investments;
drop policy if exists "owner can update investments" on public.investments;
drop policy if exists "owner can delete investments" on public.investments;

create policy "budget members can read investments"
on public.investments for select using (public.can_access_owner_budget(user_id));

create policy "owner can insert investments"
on public.investments for insert with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can update investments"
on public.investments for update using (auth.uid() = user_id and public.is_budget_owner_account()) with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can delete investments"
on public.investments for delete using (auth.uid() = user_id and public.is_budget_owner_account());

-- category_budgets
alter table public.category_budgets enable row level security;
drop policy if exists "budget members can read category_budgets" on public.category_budgets;
drop policy if exists "owner can insert category_budgets" on public.category_budgets;
drop policy if exists "owner can update category_budgets" on public.category_budgets;
drop policy if exists "owner can delete category_budgets" on public.category_budgets;

create policy "budget members can read category_budgets"
on public.category_budgets for select using (public.can_access_owner_budget(user_id));

create policy "owner can insert category_budgets"
on public.category_budgets for insert with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can update category_budgets"
on public.category_budgets for update using (auth.uid() = user_id and public.is_budget_owner_account()) with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can delete category_budgets"
on public.category_budgets for delete using (auth.uid() = user_id and public.is_budget_owner_account());
