-- Migration: 014_allow_heic_in_receipts_bucket.sql
-- Allow image/heic and image/heif in receipts storage bucket and increase limit to 10MB
update storage.buckets
set allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'application/pdf', 'image/heic', 'image/heif'],
    file_size_limit = 10485760
where id = 'receipts';
