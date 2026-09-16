-- Migration: 011_receipt_pdf_and_subscription_skip.sql
-- 1. Update receipts storage bucket to allow application/pdf
update storage.buckets
set allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'application/pdf']
where id = 'receipts';

-- 2. Add initial_start_date and skipped_dates to subscriptions table
alter table public.subscriptions
  add column if not exists initial_start_date date,
  add column if not exists skipped_dates text[] default '{}'::text[];
