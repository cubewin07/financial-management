-- Migration: 008_income_and_budget_columns.sql
-- Add income and budget breakdown columns to user_settings table
-- Default all income/budget amounts to 0

alter table public.user_settings
  add column if not exists fixed_budget numeric(12,2) not null default 0,
  add column if not exists salary_allocation numeric(12,2) not null default 0,
  add column if not exists part_time_hours numeric(5,2) not null default 0,
  add column if not exists part_time_rate numeric(12,2) not null default 0;

alter table public.user_settings
  alter column monthly_budget set default 0;
