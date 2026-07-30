-- Migration: 007_default_currency_nzd.sql
-- Update default currency across existing database tables (user_settings, accounts, subscriptions, savings_goals, investments) from USD to NZD

-- 1. Update column defaults for existing tables
alter table public.user_settings alter column default_currency set default 'NZD';
alter table public.accounts alter column currency set default 'NZD';
alter table public.subscriptions alter column currency set default 'NZD';
alter table public.savings_goals alter column currency set default 'NZD';
alter table public.investments alter column currency set default 'NZD';

-- 2. Migrate existing 'USD' rows to 'NZD'
update public.user_settings set default_currency = 'NZD' where default_currency = 'USD';
update public.accounts set currency = 'NZD' where currency = 'USD';
update public.subscriptions set currency = 'NZD' where currency = 'USD';
update public.savings_goals set currency = 'NZD' where currency = 'USD';
update public.investments set currency = 'NZD' where currency = 'USD';
