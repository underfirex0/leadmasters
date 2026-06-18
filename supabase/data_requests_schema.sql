-- ═══════════════════════════════════════════════════════════
-- LeadMaster — Data Import Requests + Feature Access Control
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── 1. Data Upload Requests ─────────────────────────────────
-- Users upload CSVs → admin downloads, maps columns, injects into CRM

CREATE TABLE IF NOT EXISTS data_upload_requests (
  id                UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name         TEXT         NOT NULL,
  file_path         TEXT         NOT NULL,  -- path in Supabase Storage bucket "data-uploads"
  file_size_bytes   INTEGER,
  estimated_rows    INTEGER,                -- user-provided estimate (optional)
  user_notes        TEXT,                   -- user's column mapping description
  admin_notes       TEXT,                   -- admin's internal notes
  status            TEXT         NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','processing','completed','rejected')),
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW(),
  processed_at      TIMESTAMPTZ
);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER data_upload_requests_updated_at
  BEFORE UPDATE ON data_upload_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE data_upload_requests ENABLE ROW LEVEL SECURITY;

-- Users see only their own requests
CREATE POLICY "users_view_own_requests" ON data_upload_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Users create their own requests
CREATE POLICY "users_insert_own_requests" ON data_upload_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins bypass via service role (supabaseAdmin) — no extra policy needed


-- ── 2. Feature Access Control ───────────────────────────────
-- Admin can enable/disable specific features per user, overriding plan defaults

CREATE TABLE IF NOT EXISTS user_feature_access (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature     TEXT        NOT NULL CHECK (feature IN (
                'search',        -- Can run company searches
                'meetmaster',    -- Can access MeetMaster directory
                'crm',           -- Can access CRM pipeline
                'export',        -- Can export CSV
                'data_upload'    -- Can upload data for CRM import
              )),
  enabled     BOOLEAN     NOT NULL DEFAULT true,
  reason      TEXT,               -- Admin's reason for override
  updated_by  UUID        REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, feature)
);

CREATE TRIGGER user_feature_access_updated_at
  BEFORE UPDATE ON user_feature_access
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_feature_access ENABLE ROW LEVEL SECURITY;

-- Users can read their own feature access (app uses this to show/hide UI)
CREATE POLICY "users_view_own_feature_access" ON user_feature_access
  FOR SELECT USING (auth.uid() = user_id);

-- Admins bypass via service role (supabaseAdmin)


-- ── 3. Supabase Storage Bucket ──────────────────────────────
-- Create a bucket named "data-uploads" (PRIVATE) in the Supabase dashboard,
-- then run these policies:

-- Users can upload to their own folder: data-uploads/{user_id}/...
CREATE POLICY "upload_own_files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'data-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can list/view their own files
CREATE POLICY "view_own_files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'data-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admins download via service role (bypass RLS) — no policy needed


-- ── 4. Helper view for admin ────────────────────────────────
-- Joins requests with user email for the admin panel

CREATE OR REPLACE VIEW data_upload_requests_with_user AS
SELECT
  r.*,
  p.email        AS user_email,
  p.full_name    AS user_name,
  p.plan_id      AS user_plan
FROM data_upload_requests r
JOIN profiles p ON p.id = r.user_id;
