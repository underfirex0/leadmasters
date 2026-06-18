-- ============================================================
-- LeadScout — Pricing Schema
-- Implements: LeadScout_Tarification_Maroc.docx
-- Plans · Subscriptions · Teams · Top-ups · Invoices · Referrals
-- ============================================================

-- ── PLANS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plans (
  id                       TEXT PRIMARY KEY,
  name                     TEXT NOT NULL,
  price_monthly            INTEGER NOT NULL DEFAULT 0,   -- MAD/month (monthly billing)
  price_annual_monthly     INTEGER NOT NULL DEFAULT 0,   -- MAD/month (annual billing)
  credits_per_month        INTEGER,                      -- NULL = unlimited
  max_users                INTEGER DEFAULT 1,            -- NULL = unlimited
  rollover_months          INTEGER DEFAULT 0,
  max_rollover_credits     INTEGER DEFAULT 0,
  csv_export_limit         INTEGER,                      -- NULL = unlimited, 5/100 for free/solo
  crm_mode                 TEXT DEFAULT 'full',          -- 'readonly' | 'full' | 'advanced'
  api_access               BOOLEAN DEFAULT false,
  meetmaster_meetings      INTEGER DEFAULT 0,            -- free meetings/month
  support_tier             TEXT DEFAULT 'faq',           -- 'faq'|'email'|'priority'|'dedicated'
  is_public                BOOLEAN DEFAULT true,
  sort_order               INTEGER DEFAULT 0
);

INSERT INTO public.plans VALUES
  ('decouverte', 'Découverte', 0,   0,   100,  1,    0, 0,    5,    'readonly',  false, 0, 'faq',       true, 1),
  ('solo',       'Solo',       149, 119, 400,  1,    1, 400,  100,  'full',      false, 0, 'email',     true, 2),
  ('equipe',     'Équipe',     390, 299, 1500, 3,    2, 1500, null, 'full',      false, 0, 'priority',  true, 3),
  ('business',   'Business',   990, 790, 5000, 10,   3, 5000, null, 'advanced',  true,  1, 'dedicated', true, 4),
  ('entreprise', 'Entreprise', 0,   0,   null, null, 0, 0,    null, 'advanced',  true,  3, 'dedicated', true, 5)
ON CONFLICT (id) DO UPDATE SET
  price_monthly        = EXCLUDED.price_monthly,
  price_annual_monthly = EXCLUDED.price_annual_monthly,
  credits_per_month    = EXCLUDED.credits_per_month,
  max_users            = EXCLUDED.max_users,
  rollover_months      = EXCLUDED.rollover_months,
  max_rollover_credits = EXCLUDED.max_rollover_credits,
  csv_export_limit     = EXCLUDED.csv_export_limit,
  crm_mode             = EXCLUDED.crm_mode,
  api_access           = EXCLUDED.api_access,
  meetmaster_meetings  = EXCLUDED.meetmaster_meetings,
  support_tier         = EXCLUDED.support_tier;

-- ── PROFILES EXTENSIONS ──────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_id        TEXT DEFAULT 'decouverte' REFERENCES public.plans(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin       BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code  TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by    UUID REFERENCES public.profiles(id);

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id               UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  plan_id               TEXT REFERENCES public.plans(id),
  billing_cycle         TEXT DEFAULT 'monthly',     -- 'monthly' | 'annual'
  status                TEXT DEFAULT 'pending',     -- 'pending'|'active'|'cancelled'|'expired'
  current_period_start  TIMESTAMPTZ DEFAULT NOW(),
  current_period_end    TIMESTAMPTZ,
  rollover_credits      INTEGER DEFAULT 0,          -- credits carried from last period
  notes                 TEXT,                       -- admin notes
  requested_at          TIMESTAMPTZ DEFAULT NOW(),
  activated_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── ORGANIZATIONS (TEAMS) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name            TEXT NOT NULL,
  owner_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

CREATE TABLE IF NOT EXISTS public.org_members (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id      UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT DEFAULT 'member',  -- 'owner'|'admin'|'member'
  status      TEXT DEFAULT 'pending', -- 'pending'|'active'|'removed'
  invite_email TEXT,
  invited_at  TIMESTAMPTZ DEFAULT NOW(),
  joined_at   TIMESTAMPTZ,
  UNIQUE(org_id, user_id)
);

-- ── CREDIT PACKS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_packs (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  credits      INTEGER NOT NULL,
  price_mad    INTEGER NOT NULL,
  price_per_cr NUMERIC(6,2),
  valid_months INTEGER DEFAULT 12,
  is_active    BOOLEAN DEFAULT true
);

INSERT INTO public.credit_packs VALUES
  ('boost',     'Pack Boost',     200,   59,   0.30, 12, true),
  ('essential', 'Pack Essential', 500,   139,  0.28, 12, true),
  ('growth',    'Pack Growth',    2000,  469,  0.23, 12, true),
  ('pro',       'Pack Pro',       5000,  990,  0.20, 12, true),
  ('mega',      'Pack Mega',      15000, 2490, 0.17, 12, true)
ON CONFLICT (id) DO UPDATE SET
  credits   = EXCLUDED.credits,
  price_mad = EXCLUDED.price_mad;

-- ── PACK PURCHASES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pack_purchases (
  id                 UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id            UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  pack_id            TEXT REFERENCES public.credit_packs(id),
  credits_purchased  INTEGER NOT NULL,
  credits_remaining  INTEGER NOT NULL,
  price_paid         INTEGER NOT NULL,
  expires_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── INVOICES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID REFERENCES public.profiles(id),
  invoice_number TEXT UNIQUE,
  type           TEXT NOT NULL,       -- 'subscription'|'topup'
  amount_ht      INTEGER NOT NULL,
  tva_rate       NUMERIC(4,2) DEFAULT 20.00,
  tva_amount     INTEGER,
  total_ttc      INTEGER,
  plan_id        TEXT,
  pack_id        TEXT,
  billing_cycle  TEXT,
  status         TEXT DEFAULT 'pending', -- 'pending'|'paid'|'cancelled'
  period_start   TIMESTAMPTZ,
  period_end     TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  paid_at        TIMESTAMPTZ
);

-- ── REFERRALS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referrer_id     UUID REFERENCES public.profiles(id),
  referred_id     UUID REFERENCES public.profiles(id),
  referral_code   TEXT NOT NULL,
  status          TEXT DEFAULT 'pending', -- 'pending'|'completed'
  credits_awarded INTEGER DEFAULT 100,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_user    ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_pack_purchases_user   ON pack_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user         ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status       ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_referrals_code        ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_org_members_org       ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user      ON org_members(user_id);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE public.plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals     ENABLE ROW LEVEL SECURITY;

-- Plans: public read
DROP POLICY IF EXISTS "plans_public_read" ON plans;
CREATE POLICY "plans_public_read" ON plans FOR SELECT USING (true);

-- Subscriptions: own only
DROP POLICY IF EXISTS "subs_own_select" ON subscriptions;
DROP POLICY IF EXISTS "subs_own_insert" ON subscriptions;
CREATE POLICY "subs_own_select" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subs_own_insert" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Pack purchases: own only
DROP POLICY IF EXISTS "packs_own_select" ON pack_purchases;
CREATE POLICY "packs_own_select" ON pack_purchases FOR SELECT USING (auth.uid() = user_id);

-- Invoices: own only
DROP POLICY IF EXISTS "invoices_own_select" ON invoices;
CREATE POLICY "invoices_own_select" ON invoices FOR SELECT USING (auth.uid() = user_id);

-- Credit packs: public read
DROP POLICY IF EXISTS "credit_packs_public_read" ON credit_packs;
CREATE POLICY "credit_packs_public_read" ON credit_packs FOR SELECT USING (is_active = true);

-- ── FUNCTIONS ─────────────────────────────────────────────────

-- Generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  code TEXT;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text) FROM 1 FOR 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = code);
  END LOOP;
  RETURN code;
END;
$$;

-- Process subscription renewal (called when period expires)
CREATE OR REPLACE FUNCTION public.process_subscription_renewal(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  sub       RECORD;
  plan      RECORD;
  profile   RECORD;
  rollover  INTEGER;
  new_end   TIMESTAMPTZ;
  result    JSONB;
BEGIN
  -- Get subscription and plan
  SELECT s.*, p.* INTO sub
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.user_id = p_user_id AND s.status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_active_subscription');
  END IF;

  -- Check if renewal is due
  IF sub.current_period_end > NOW() THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_due_yet');
  END IF;

  -- Get current balance
  SELECT credit_balance INTO profile FROM profiles WHERE id = p_user_id;

  -- Calculate rollover: min(current_balance, max_rollover_credits)
  IF sub.rollover_months > 0 AND sub.max_rollover_credits > 0 THEN
    rollover := LEAST(profile.credit_balance, sub.max_rollover_credits);
  ELSE
    rollover := 0;
  END IF;

  -- Calculate new period end
  IF sub.billing_cycle = 'annual' THEN
    new_end := sub.current_period_end + INTERVAL '1 year';
  ELSE
    new_end := sub.current_period_end + INTERVAL '1 month';
  END IF;

  -- Set new balance: rollover + new monthly credits
  IF sub.credits_per_month IS NOT NULL THEN
    UPDATE profiles
    SET credit_balance = rollover + sub.credits_per_month
    WHERE id = p_user_id;

    -- Log transaction
    INSERT INTO credit_transactions (user_id, amount, balance_after, type, description)
    SELECT p_user_id,
           (rollover + sub.credits_per_month),
           rollover + sub.credits_per_month,
           'grant',
           'Renouvellement mensuel — ' || sub.name || ' (' || rollover || ' report + ' || sub.credits_per_month || ' nouveaux)';
  END IF;

  -- Update subscription period
  UPDATE subscriptions
  SET current_period_start = sub.current_period_end,
      current_period_end   = new_end,
      rollover_credits      = rollover,
      updated_at            = NOW()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success',       true,
    'rollover',      rollover,
    'new_credits',   COALESCE(sub.credits_per_month, 0),
    'new_balance',   rollover + COALESCE(sub.credits_per_month, 0),
    'period_end',    new_end
  );
END;
$$;

-- Get user plan details (for middleware checks)
CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'plan_id',           p.id,
    'plan_name',         p.name,
    'credits_per_month', p.credits_per_month,
    'max_users',         p.max_users,
    'csv_export_limit',  p.csv_export_limit,
    'crm_mode',          p.crm_mode,
    'api_access',        p.api_access,
    'sub_status',        COALESCE(s.status, 'none'),
    'period_end',        s.current_period_end,
    'rollover_credits',  COALESCE(s.rollover_credits, 0),
    'credit_balance',    pr.credit_balance
  )
  INTO result
  FROM profiles pr
  LEFT JOIN plans p ON p.id = pr.plan_id
  LEFT JOIN subscriptions s ON s.user_id = pr.id AND s.status = 'active'
  WHERE pr.id = p_user_id;

  RETURN result;
END;
$$;

-- Invoice number generator
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  seq INTEGER;
  year TEXT;
BEGIN
  year := to_char(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(substring(invoice_number FROM 9) AS INTEGER)), 0) + 1
  INTO seq
  FROM invoices
  WHERE invoice_number LIKE 'LS-' || year || '-%';
  RETURN 'LS-' || year || '-' || lpad(seq::TEXT, 4, '0');
END;
$$;

-- Auto-generate referral code on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_pricing()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Assign referral code
  UPDATE public.profiles
  SET referral_code = public.generate_referral_code(),
      plan_id       = 'decouverte'
  WHERE id = NEW.id AND referral_code IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_pricing ON public.profiles;
CREATE TRIGGER on_profile_created_pricing
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_pricing();

-- Update existing profiles that don't have referral codes
UPDATE public.profiles SET referral_code = public.generate_referral_code() WHERE referral_code IS NULL;
UPDATE public.profiles SET plan_id = 'decouverte' WHERE plan_id IS NULL;
