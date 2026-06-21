-- ═══════════════════════════════════════════════════════════
-- LeadMaster — CRM bug fixes + Data Injection feature
-- Run this ONCE in your Supabase SQL Editor.
-- Every statement is idempotent (safe to re-run).
-- ═══════════════════════════════════════════════════════════

-- ── 1. CRM bug fixes ─────────────────────────────────────────
-- These columns are used by the app but may be missing depending
-- on which migrations have already run. IF NOT EXISTS makes this
-- safe regardless of current state.

ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS callback_date      TIMESTAMPTZ;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS callback_note      TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS last_contacted_at  TIMESTAMPTZ;

-- The app offers 4 priority levels (low/normal/high/urgent) but the
-- original CHECK constraint only allowed 3 — clicking through to
-- "urgent" silently failed at the database level. Widen it.
ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS crm_leads_priority_check;
ALTER TABLE crm_leads ADD CONSTRAINT crm_leads_priority_check
  CHECK (priority IN ('low','normal','high','urgent'));


-- ── 2. Data Injection — extend crm_leads for imported leads ──
-- Imported leads (admin-injected client CSVs) are NOT tied to the
-- platform's `businesses` table — they have their own data, arbitrary
-- columns, and no credit-based field unlocking. We extend crm_leads
-- rather than create a parallel table, so the existing CRM UI, status
-- pipeline, call logging, and filters all work identically for both
-- lead origins with zero duplicated logic.

-- business_id must become nullable — imported leads have no business row
ALTER TABLE crm_leads ALTER COLUMN business_id DROP NOT NULL;

-- Where this lead came from
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'search'
  CHECK (source IN ('search', 'import'));

-- Traceability back to the upload request that produced this lead
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS import_request_id UUID
  REFERENCES data_upload_requests(id) ON DELETE SET NULL;

-- Denormalized fields for imported leads (search-sourced leads keep using
-- the joined `businesses` row instead — these stay NULL for those rows)
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS company_name    TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS phone           TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS email           TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS website         TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS contact_name    TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS city            TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS country         TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS sector          TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS is_manufacturer BOOLEAN;

-- Catch-all for any column from any client file that doesn't map to a
-- named field above — nothing the admin imports is ever lost.
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Indexes for the new filter dimensions
CREATE INDEX IF NOT EXISTS idx_crm_leads_source           ON crm_leads(user_id, source);
CREATE INDEX IF NOT EXISTS idx_crm_leads_country           ON crm_leads(user_id, country) WHERE country IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_is_manufacturer   ON crm_leads(user_id, is_manufacturer) WHERE is_manufacturer IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_custom_fields_gin ON crm_leads USING GIN (custom_fields);

-- Data integrity: a search-sourced lead must have a business_id;
-- an import-sourced lead must have a company_name. Drop+recreate to
-- stay idempotent.
ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS crm_leads_source_consistency;
ALTER TABLE crm_leads ADD CONSTRAINT crm_leads_source_consistency
  CHECK (
    (source = 'search' AND business_id IS NOT NULL) OR
    (source = 'import' AND company_name IS NOT NULL)
  );


-- ── 3. Track injection results on the upload request ──────────
ALTER TABLE data_upload_requests ADD COLUMN IF NOT EXISTS injected_count INTEGER;
ALTER TABLE data_upload_requests ADD COLUMN IF NOT EXISTS injected_at    TIMESTAMPTZ;


-- ── 5. Allow Excel uploads (not just CSV) ──────────────────────
-- Real client files are very often .xlsx — widen the bucket's allowed
-- MIME types. Safe no-op if the bucket doesn't exist yet (run
-- fix_storage_bucket.sql first if you haven't already).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'text/csv',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
WHERE id = 'data-uploads';


-- ── 6. Verify ───────────────────────────────────────────────
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'crm_leads'
ORDER BY ordinal_position;
