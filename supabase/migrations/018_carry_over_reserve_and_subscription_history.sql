-- Migration: 018_carry_over_reserve_and_subscription_history.sql
-- Carry-over becomes a reserve outside the budget, moved into a month only on request.
-- Ended subscriptions keep their past charges, and price changes no longer rewrite history.

alter table public.user_settings
  add column if not exists carry_over_allocated numeric(12,2) not null default 0,
  add column if not exists carry_over_allocated_month text,
  add column if not exists carry_over_closed_through text;

alter table public.subscriptions
  add column if not exists ended_on date,
  add column if not exists archived_at timestamptz,
  add column if not exists price_history jsonb not null default '[]'::jsonb;
