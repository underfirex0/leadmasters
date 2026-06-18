-- ============================================================
-- LeadScout Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email         TEXT NOT NULL,
  full_name     TEXT,
  credit_balance INTEGER NOT NULL DEFAULT 100,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- BUSINESSES (the core dataset)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.businesses (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name            TEXT NOT NULL,
  sector          TEXT NOT NULL,
  subsector       TEXT,
  region          TEXT,
  city            TEXT NOT NULL,
  country         TEXT DEFAULT 'Maroc',
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  address         TEXT,
  postal_code     TEXT,
  effectif_min    INTEGER,
  effectif_max    INTEGER,
  effectif_label  TEXT,
  dirigeant_name  TEXT,
  dirigeant_phone TEXT,
  dirigeant_email TEXT,
  revenue_label   TEXT,
  legal_form      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- QUERIES (search history)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.queries (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  filters          JSONB NOT NULL DEFAULT '{}',
  fields_requested TEXT[] NOT NULL DEFAULT '{}',
  result_count     INTEGER NOT NULL DEFAULT 0,
  credits_spent    INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'complete'
                   CHECK (status IN ('pending', 'complete', 'refunded')),
  query_name       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- UNLOCK EVENTS (à la carte field unlocking)
-- Unique constraint prevents double charging
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.unlock_events (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  business_id   UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  field         TEXT NOT NULL,
  credits_spent INTEGER NOT NULL,
  unlocked_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, business_id, field)
);

-- ────────────────────────────────────────────────────────────
-- CREDIT TRANSACTIONS (full audit log)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type          TEXT NOT NULL
                CHECK (type IN ('grant', 'query', 'unlock', 'refund', 'purchase')),
  amount        INTEGER NOT NULL,  -- positive = added, negative = spent
  balance_after INTEGER NOT NULL,
  ref_id        UUID,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_businesses_sector ON businesses(sector);
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city);
CREATE INDEX IF NOT EXISTS idx_businesses_region ON businesses(region);
CREATE INDEX IF NOT EXISTS idx_businesses_effectif ON businesses(effectif_label);
CREATE INDEX IF NOT EXISTS idx_queries_user_id ON queries(user_id);
CREATE INDEX IF NOT EXISTS idx_unlock_events_user_biz ON unlock_events(user_id, business_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_user_id ON credit_transactions(user_id);

-- Full-text search on businesses (French language)
CREATE INDEX IF NOT EXISTS idx_businesses_fts ON businesses USING GIN(
  to_tsvector('french',
    COALESCE(name, '') || ' ' ||
    COALESCE(sector, '') || ' ' ||
    COALESCE(city, '') || ' ' ||
    COALESCE(subsector, '')
  )
);

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlock_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles: users see and update only their own
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Businesses: any authenticated user can read (masking happens in API)
CREATE POLICY "businesses_select_auth" ON businesses
  FOR SELECT TO authenticated USING (true);

-- Queries: users see/insert their own
CREATE POLICY "queries_select_own" ON queries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "queries_insert_own" ON queries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Unlock events: users see/insert their own
CREATE POLICY "unlock_select_own" ON unlock_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "unlock_insert_own" ON unlock_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Credit transactions: users see their own (no insert from client)
CREATE POLICY "credits_select_own" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- FUNCTION: deduct_credits (atomic, prevents double-spend)
-- Called from API with service role key
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id    UUID,
  p_amount     INTEGER,
  p_type       TEXT,
  p_ref_id     UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  -- Lock the row to prevent concurrent deductions
  SELECT credit_balance INTO v_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found: %', p_user_id;
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits: has %, needs %', v_balance, p_amount;
  END IF;

  -- Deduct
  UPDATE public.profiles
  SET credit_balance = credit_balance - p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;

  v_balance := v_balance - p_amount;

  -- Log transaction
  INSERT INTO public.credit_transactions
    (user_id, type, amount, balance_after, ref_id, description)
  VALUES
    (p_user_id, p_type, -p_amount, v_balance, p_ref_id, p_description);

  RETURN v_balance;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- FUNCTION: add_credits (for purchases / grants)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id     UUID,
  p_amount      INTEGER,
  p_type        TEXT DEFAULT 'grant',
  p_description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  UPDATE public.profiles
  SET credit_balance = credit_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING credit_balance INTO v_balance;

  INSERT INTO public.credit_transactions
    (user_id, type, amount, balance_after, description)
  VALUES
    (p_user_id, p_type, p_amount, v_balance, p_description);

  RETURN v_balance;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- TRIGGER: create profile on signup with 100 welcome credits
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, credit_balance)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    100
  );

  INSERT INTO public.credit_transactions
    (user_id, type, amount, balance_after, description)
  VALUES
    (NEW.id, 'grant', 100, 100, 'Bonus de bienvenue — 100 crédits offerts');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
