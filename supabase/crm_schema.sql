-- ============================================================
-- LeadScout CRM Schema — run AFTER schema.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- CRM LEADS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  business_id     UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  query_id        UUID REFERENCES public.queries(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'to_call'
                  CHECK (status IN ('to_call','in_progress','callback','interested','not_interested','converted','archived')),
  priority        TEXT NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('low','normal','high')),
  notes           TEXT,
  next_action_at  TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);

-- ────────────────────────────────────────────────────────────
-- CRM CALL LOGS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_call_logs (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id     UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  outcome     TEXT NOT NULL
              CHECK (outcome IN ('no_answer','voicemail','callback','interested','not_interested')),
  notes       TEXT,
  called_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_leads_user_status ON crm_leads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_next_action ON crm_leads(user_id, next_action_at);
CREATE INDEX IF NOT EXISTS idx_crm_call_logs_lead ON crm_call_logs(lead_id);

-- RLS
ALTER TABLE public.crm_leads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_leads_all_own"     ON crm_leads     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "crm_call_logs_all_own" ON crm_call_logs FOR ALL USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_crm_lead_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE OR REPLACE TRIGGER crm_leads_updated_at
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_crm_lead_timestamp();
