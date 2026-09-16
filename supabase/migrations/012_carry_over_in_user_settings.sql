-- Migration: 012_carry_over_in_user_settings.sql
-- Maintain carry_over and category_limits as single persistent state in user_settings table

-- 1. Ensure receipts storage bucket explicitly includes application/pdf
update storage.buckets
set allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'application/pdf']
where id = 'receipts';

-- 2. Add carry_over and category_limits columns to public.user_settings
alter table public.user_settings
  add column if not exists carry_over numeric(12,2) not null default 0,
  add column if not exists category_limits jsonb not null default '{}'::jsonb;

-- 3. Backfill latest carry_over and category_limits from monthly_snapshots if available
update public.user_settings u
set 
  carry_over = coalesce((
    select s.carry_over 
    from public.monthly_snapshots s 
    where s.user_id = u.user_id 
    order by s.month desc 
    limit 1
  ), 0),
  category_limits = coalesce((
    select s.category_limits 
    from public.monthly_snapshots s 
    where s.user_id = u.user_id and s.category_limits is not null and s.category_limits <> '{}'::jsonb
    order by s.month desc 
    limit 1
  ), '{}'::jsonb);
