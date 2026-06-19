-- ═══════════════════════════════════════════════════════════
-- LeadMaster — Fix: Create missing "data-uploads" storage bucket
-- Run this ONCE in your Supabase SQL Editor.
-- Safe to re-run — does nothing if the bucket already exists.
-- ═══════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'data-uploads',
  'data-uploads',
  false,                          -- private bucket, not publicly readable
  20971520,                       -- 20 MB max file size
  ARRAY['text/csv', 'text/plain', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO NOTHING;

-- Verify it worked — should return one row:
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'data-uploads';
