-- ============================================================
-- MeetMaster Schema — run AFTER schema.sql and crm_schema.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- MASTERS (executive profiles)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.masters (
  id                     UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id                UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name              TEXT NOT NULL,
  display_name           TEXT NOT NULL, -- "Mohammed A." for privacy
  role                   TEXT NOT NULL,
  company_name           TEXT,
  show_company           BOOLEAN DEFAULT false,
  company_sector         TEXT,
  company_size           TEXT,
  city                   TEXT,
  bio                    TEXT,
  expertise              TEXT[] DEFAULT '{}',
  topics                 TEXT[] DEFAULT '{}', -- what to ask about
  linkedin_url           TEXT,
  price_per_meeting      INTEGER NOT NULL DEFAULT 1000,
  payout_per_meeting     INTEGER NOT NULL DEFAULT 500,
  max_meetings_per_month INTEGER NOT NULL DEFAULT 4,
  meetings_completed     INTEGER DEFAULT 0,
  average_rating         NUMERIC(3,2),
  is_verified            BOOLEAN DEFAULT false,
  is_active              BOOLEAN DEFAULT true,
  application_status     TEXT DEFAULT 'pending'
                         CHECK (application_status IN ('pending','approved','rejected')),
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- MEETING REQUESTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meeting_requests (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  buyer_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  master_id         UUID REFERENCES public.masters(id) ON DELETE CASCADE NOT NULL,
  status            TEXT DEFAULT 'pending'
                    CHECK (status IN (
                      'pending','accepted','completed',
                      'cancelled_buyer','cancelled_master','rejected'
                    )),
  topic             TEXT NOT NULL,
  context           TEXT,
  buyer_company     TEXT,
  buyer_role        TEXT,
  preferred_date_1  TIMESTAMPTZ,
  preferred_date_2  TIMESTAMPTZ,
  preferred_date_3  TIMESTAMPTZ,
  confirmed_date    TIMESTAMPTZ,
  meeting_link      TEXT,
  duration_minutes  INTEGER DEFAULT 30,
  amount_buyer      INTEGER DEFAULT 1000,
  amount_master     INTEGER DEFAULT 500,
  payment_status    TEXT DEFAULT 'pending'
                    CHECK (payment_status IN ('pending','invoiced','paid','payout_sent')),
  rejection_reason  TEXT,
  buyer_feedback    TEXT,
  buyer_rating      INTEGER CHECK (buyer_rating BETWEEN 1 AND 5),
  master_feedback   TEXT,
  master_rating     INTEGER CHECK (master_rating BETWEEN 1 AND 5),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_masters_status   ON masters(application_status);
CREATE INDEX IF NOT EXISTS idx_masters_role     ON masters(role);
CREATE INDEX IF NOT EXISTS idx_masters_city     ON masters(city);
CREATE INDEX IF NOT EXISTS idx_meetings_buyer   ON meeting_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_meetings_master  ON meeting_requests(master_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status  ON meeting_requests(status);

-- RLS
ALTER TABLE public.masters          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_requests ENABLE ROW LEVEL SECURITY;

-- Masters: anyone can read approved, only owner can update
CREATE POLICY "masters_select_approved"
  ON masters FOR SELECT USING (application_status = 'approved' AND is_active = true);
CREATE POLICY "masters_update_own"
  ON masters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "masters_insert_own"
  ON masters FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Meeting requests: buyer sees their own, master sees requests for them
CREATE POLICY "meetings_select_buyer"
  ON meeting_requests FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "meetings_insert_buyer"
  ON meeting_requests FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "meetings_update_buyer"
  ON meeting_requests FOR UPDATE USING (auth.uid() = buyer_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.update_meeting_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE OR REPLACE TRIGGER meetings_updated_at
  BEFORE UPDATE ON public.meeting_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_meeting_timestamp();

CREATE OR REPLACE TRIGGER masters_updated_at
  BEFORE UPDATE ON public.masters
  FOR EACH ROW EXECUTE FUNCTION public.update_meeting_timestamp();

-- ────────────────────────────────────────────────────────────
-- SEED — 8 demo Masters (no user_id — demo profiles)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.masters (
  full_name, display_name, role, company_sector, company_size,
  city, bio, expertise, topics,
  price_per_meeting, payout_per_meeting, max_meetings_per_month,
  meetings_completed, average_rating, is_verified,
  application_status, is_active
) VALUES

('Mohammed Alaoui', 'Mohammed A.', 'DRH',
 'Industrie & Manufacturing', '500-1000 employés', 'Casablanca',
 '15 ans d''expérience en ressources humaines dans le secteur industriel. Ancien DRH de deux groupes cotés à la Bourse de Casablanca. Expert en transformation RH et gestion des talents à grande échelle.',
 ARRAY['Recrutement', 'Formation', 'GPEC', 'Droit Social', 'Culture RH'],
 ARRAY['Stratégies de recrutement au Maroc', 'Benchmarks salariaux sectoriels', 'Gestion des talents en industrie', 'Digitalisation des process RH'],
 1000, 500, 4, 23, 4.9, true, 'approved', true),

('Khalid Berrada', 'Khalid B.', 'DAF',
 'Services Financiers', '200-500 employés', 'Casablanca',
 'Directeur Administratif et Financier avec 12 ans d''expérience dans le secteur financier et bancaire. Expert en levée de fonds, structuration financière et gestion de la trésorerie d''entreprise.',
 ARRAY['Budget & Contrôle', 'Trésorerie', 'Fiscalité', 'Audit', 'Levée de fonds'],
 ARRAY['Optimisation de la trésorerie', 'Structuration financière PME/ETI', 'Relations avec les banques marocaines', 'Fiscalité d''entreprise au Maroc'],
 1000, 500, 4, 18, 4.8, true, 'approved', true),

('Nadia Cherkaoui', 'Nadia C.', 'Directrice des Achats',
 'Grande Distribution', '1000+ employés', 'Rabat',
 'Directrice des Achats depuis 10 ans dans la grande distribution. Experte en négociation avec les fournisseurs internationaux, supply chain et appels d''offres complexes.',
 ARRAY['Sourcing', 'Négociation fournisseurs', 'Supply Chain', 'Appels d''offres', 'Import/Export'],
 ARRAY['Négociation avec fournisseurs internationaux', 'Mise en place d''une politique achats', 'Réduction des coûts d''approvisionnement', 'Supply chain resilience'],
 1000, 500, 3, 31, 4.7, true, 'approved', true),

('Youssef Tazi', 'Youssef T.', 'DG / CEO',
 'Technologies de l''information', '50-200 employés', 'Casablanca',
 'Fondateur et CEO d''une scale-up tech marocaine. 8 ans d''expérience entrepreneuriale, deux levées de fonds réussies. Mentor de plusieurs startups du programme Maroc Numeric.',
 ARRAY['Stratégie', 'Business Development', 'Fundraising', 'Croissance', 'International'],
 ARRAY['Démarrage et scaling d''une startup au Maroc', 'Accès au financement (VC, fonds, banques)', 'Stratégie d''entrée sur marchés africains', 'Pivot et transformation business model'],
 1000, 500, 4, 15, 5.0, true, 'approved', true),

('Fatima Benali', 'Fatima B.', 'DRH',
 'Santé & Pharma', '200-500 employés', 'Rabat',
 'Directrice des RH dans le secteur de la santé depuis 9 ans. Spécialisée dans le recrutement de profils médicaux et paramédicaux, la gestion des carrières et la conformité réglementaire RH.',
 ARRAY['Recrutement Médical', 'Formation', 'GPEC', 'Conformité RH', 'Mobilité interne'],
 ARRAY['Recrutement dans le secteur médical', 'Gestion des équipes pluridisciplinaires', 'Réglementation RH santé au Maroc', 'Wellbeing et QVT'],
 1000, 500, 3, 11, 4.8, false, 'approved', true),

('Ahmed El Fassi', 'Ahmed F.', 'Directeur Commercial',
 'BTP & Construction', '200-500 employés', 'Tanger',
 'Directeur Commercial B2B avec 11 ans d''expérience dans le BTP et les matériaux de construction. Expert en vente grands comptes, développement de réseaux de distribution et marchés publics.',
 ARRAY['B2B Sales', 'Grands comptes', 'Distribution', 'Marchés publics', 'Export'],
 ARRAY['Développement commercial B2B au Maroc', 'Réponse aux appels d''offres publics', 'Construction d''un réseau de distribution', 'Pénétration de nouveaux marchés africains'],
 1000, 500, 4, 8, 4.6, false, 'approved', true),

('Sara Benchaaboun', 'Sara B.', 'DSI',
 'FMCG & Agroalimentaire', '500-1000 employés', 'Casablanca',
 'Directrice des Systèmes d''Information depuis 7 ans dans le secteur FMCG. Led la transformation digitale complète d''un groupe agro avec déploiement SAP, e-commerce B2B et BI avancée.',
 ARRAY['Transformation digitale', 'ERP & SAP', 'Cybersécurité', 'E-commerce B2B', 'Data & BI'],
 ARRAY['Roadmap de transformation digitale', 'Choix et déploiement d''un ERP', 'Cybersécurité pour entreprises marocaines', 'ROI des projets IT'],
 1000, 500, 2, 19, 4.9, true, 'approved', true),

('Hassan Lahlou', 'Hassan L.', 'DAF',
 'Immobilier & Construction', '50-200 employés', 'Marrakech',
 'DAF d''un groupe immobilier de renom depuis 8 ans. Expert en montage financier de projets immobiliers, financement bancaire, gestion de SCI et optimisation fiscale dans le secteur immobilier marocain.',
 ARRAY['Montage financier', 'Fiscalité immobilière', 'Financement bancaire', 'SCI & OPCI', 'Audit'],
 ARRAY['Financement de projets immobiliers', 'Optimisation fiscale dans l''immobilier', 'Relations avec les banques pour promoteurs', 'Structuration juridique et financière'],
 1000, 500, 3, 7, 4.7, false, 'approved', true);
