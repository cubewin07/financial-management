-- Migration: 20260722_implement_missing_features.sql
-- Create savings_goals, notifications, and user_income_sources tables
-- Add missing columns to subscriptions and monthly_snapshots

-- 1. savings_goals table
create table if not exists public.savings_goals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    target_amount numeric(12,2) not null check (target_amount > 0),
    current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
    currency char(3) not null default 'USD',
    priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
    deadline_date date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.savings_goals add column if not exists priority text not null default 'medium';

-- 2. notifications table
create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    message text not null,
    type text not null default 'info',
    read boolean not null default false,
    created_at timestamptz not null default now()
);

-- 3. user_income_sources table
create table if not exists public.user_income_sources (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    kind text not null check (kind in ('fixed', 'salary', 'wages')),
    amount numeric(12,2) not null default 0 check (amount >= 0),
    hours_per_month numeric(6,2) default 0,
    hourly_rate numeric(10,2) default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 4. Add columns to subscriptions
alter table public.subscriptions
  add column if not exists brand_domain text,
  add column if not exists currency char(3) not null default 'USD',
  add column if not exists remind_before_billing boolean not null default false,
  add column if not exists plan_tier text;

-- 5. Add category_limits to monthly_snapshots
alter table public.monthly_snapshots
  add column if not exists category_limits jsonb default '{}'::jsonb;

-- RLS Policies

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

-- notifications
alter table public.notifications enable row level security;
drop policy if exists "budget members can read notifications" on public.notifications;
drop policy if exists "owner can insert notifications" on public.notifications;
drop policy if exists "owner can update notifications" on public.notifications;
drop policy if exists "owner can delete notifications" on public.notifications;

create policy "budget members can read notifications"
on public.notifications for select using (public.can_access_owner_budget(user_id));

create policy "owner can insert notifications"
on public.notifications for insert with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can update notifications"
on public.notifications for update using (auth.uid() = user_id and public.is_budget_owner_account()) with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can delete notifications"
on public.notifications for delete using (auth.uid() = user_id and public.is_budget_owner_account());

-- user_income_sources
alter table public.user_income_sources enable row level security;
drop policy if exists "budget members can read user_income_sources" on public.user_income_sources;
drop policy if exists "owner can insert user_income_sources" on public.user_income_sources;
drop policy if exists "owner can update user_income_sources" on public.user_income_sources;
drop policy if exists "owner can delete user_income_sources" on public.user_income_sources;

create policy "budget members can read user_income_sources"
on public.user_income_sources for select using (public.can_access_owner_budget(user_id));

create policy "owner can insert user_income_sources"
on public.user_income_sources for insert with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can update user_income_sources"
on public.user_income_sources for update using (auth.uid() = user_id and public.is_budget_owner_account()) with check (auth.uid() = user_id and public.is_budget_owner_account());

create policy "owner can delete user_income_sources"
on public.user_income_sources for delete using (auth.uid() = user_id and public.is_budget_owner_account());
