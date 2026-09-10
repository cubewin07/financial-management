-- Migration: 009_receipt_storage_and_queue.sql
-- Decoupled Agent Receipt Ingestion & Queue System

-- 1. Create storage bucket for receipts if not exists
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  5242880, -- 5MB limit
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

-- 2. Storage RLS Policies
drop policy if exists "Users can upload their own receipts" on storage.objects;
create policy "Users can upload their own receipts"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can view their own receipts" on storage.objects;
create policy "Users can view their own receipts"
on storage.objects for select to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own receipts" on storage.objects;
create policy "Users can delete their own receipts"
on storage.objects for delete to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Receipt Queue Table
create table if not exists public.receipt_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_path text not null,
  status text not null default 'uploading' check (status in ('uploading', 'pending', 'processing', 'ready_for_review', 'completed', 'failed')),
  extracted_data jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- 4. Enable RLS on receipt_queue
alter table public.receipt_queue enable row level security;

drop policy if exists "users can manage own receipt queue" on public.receipt_queue;
create policy "users can manage own receipt queue"
on public.receipt_queue
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 5. Indexes for fast status and user queries
create index if not exists idx_receipt_queue_user_status on public.receipt_queue (user_id, status);
create index if not exists idx_receipt_queue_status_created on public.receipt_queue (status, created_at);
