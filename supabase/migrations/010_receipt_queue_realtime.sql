-- Migration: 010_receipt_queue_realtime.sql
-- Enable Realtime publication and full replica identity for receipt_queue

-- 1. Enable Realtime broadcast for public.receipt_queue
alter publication supabase_realtime add table public.receipt_queue;

-- 2. Set replica identity to FULL so UPDATE/DELETE events broadcast row columns under RLS
alter table public.receipt_queue replica identity full;
