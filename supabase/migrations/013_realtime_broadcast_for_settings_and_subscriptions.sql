-- Migration: 013_realtime_broadcast_for_settings_and_subscriptions.sql
-- Enable Realtime broadcast and full replica identity for user_settings and subscriptions

-- 1. Enable Realtime broadcast for public.user_settings
alter publication supabase_realtime add table public.user_settings;
alter table public.user_settings replica identity full;

-- 2. Enable Realtime broadcast for public.subscriptions
alter publication supabase_realtime add table public.subscriptions;
alter table public.subscriptions replica identity full;
