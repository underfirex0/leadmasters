export type Business = {
  id: string
  name: string
  sector: string
  subsector: string | null
  region: string | null
  city: string
  country: string
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  postal_code: string | null
  effectif_min: number | null
  effectif_max: number | null
  effectif_label: string | null
  dirigeant_name: string | null
  dirigeant_phone: string | null
  dirigeant_email: string | null
  revenue_label: string | null
  legal_form: string | null
  created_at: string
}

export type MaskedBusiness = {
  id: string
  name: string
  sector: string
  subsector: string | null
  region: string | null
  city: string
  country: string
  legal_form: string | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  effectif_label: string | null
  dirigeant_name: string | null
  dirigeant_phone: string | null
  dirigeant_email: string | null
  revenue_label: string | null
  unlocked: Record<string, string>
}

export type Profile = {
  id: string
  email: string
  full_name: string | null
  credit_balance: number
  created_at: string
  updated_at: string
}

export type SearchFilters = {
  search?: string
  sector?: string
  city?: string
  region?: string
  effectif_label?: string
}

export type Query = {
  id: string
  user_id: string
  filters: SearchFilters
  fields_requested: string[]
  result_count: number
  credits_spent: number
  status: 'pending' | 'complete' | 'refunded'
  query_name: string | null
  created_at: string
}

export type CreditTransaction = {
  id: string
  user_id: string
  type: 'grant' | 'query' | 'unlock' | 'refund' | 'purchase'
  amount: number
  balance_after: number
  ref_id: string | null
  description: string | null
  created_at: string
}

export type SearchResult = {
  queryId: string
  businesses: MaskedBusiness[]
  totalCount: number
  creditsSpent: number
  newBalance: number
  fieldsRequested: string[]
  filters: SearchFilters
}

export type UnlockResponse = {
  value: string
  creditsSpent: number
  newBalance: number
  alreadyUnlocked: boolean
}

export type EstimateResult = {
  count: number
  costPerBusiness: number
  totalCost: number
  fieldsRequested: string[]
}

// ─── CRM ────────────────────────────────────────────────────
export type CRMStatus =
  | 'to_call'
  | 'in_progress'
  | 'callback'
  | 'interested'
  | 'not_interested'
  | 'converted'
  | 'archived'

export type CRMPriority = 'low' | 'normal' | 'high' | 'urgent'

export type CallOutcome =
  | 'no_answer'
  | 'voicemail'
  | 'callback'
  | 'interested'
  | 'not_interested'

export type CRMLead = {
  id: string
  user_id: string
  business_id: string
  query_id: string | null
  status: CRMStatus
  priority: CRMPriority
  notes: string | null
  next_action_at: string | null
  last_contacted_at: string | null
  last_called_at: string | null
  status_changed_at: string | null
  callback_date: string | null
  callback_note: string | null
  created_at: string
  updated_at: string
  // Joined
  business?: MaskedBusiness
  call_logs?: CRMCallLog[]
}

export type CRMCallLog = {
  id: string
  lead_id: string
  user_id: string
  outcome: CallOutcome
  notes: string | null
  called_at: string
}

// ─── MEETMASTER ──────────────────────────────────────────────
export type MasterRole =
  | 'DRH' | 'DAF' | 'Directeur des Achats' | 'DG / CEO'
  | 'Directeur Commercial' | 'DSI' | 'Directeur Marketing'
  | 'Directrice des Achats' | 'Directrice des RH' | 'DSI'

export type Master = {
  id: string
  user_id: string | null
  full_name: string
  display_name: string
  role: string
  company_name: string | null
  show_company: boolean
  company_sector: string | null
  company_size: string | null
  city: string | null
  bio: string | null
  expertise: string[]
  topics: string[]
  linkedin_url: string | null
  price_per_meeting: number
  payout_per_meeting: number
  max_meetings_per_month: number
  meetings_completed: number
  average_rating: number | null
  is_verified: boolean
  is_active: boolean
  application_status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export type MeetingStatus =
  | 'pending' | 'accepted' | 'completed'
  | 'cancelled_buyer' | 'cancelled_master' | 'rejected'

export type MeetingRequest = {
  id: string
  buyer_id: string
  master_id: string
  status: MeetingStatus
  topic: string
  context: string | null
  buyer_company: string | null
  buyer_role: string | null
  preferred_date_1: string | null
  preferred_date_2: string | null
  preferred_date_3: string | null
  confirmed_date: string | null
  meeting_link: string | null
  duration_minutes: number
  amount_buyer: number
  amount_master: number
  payment_status: 'pending' | 'invoiced' | 'paid' | 'payout_sent'
  rejection_reason: string | null
  buyer_feedback: string | null
  buyer_rating: number | null
  master_feedback: string | null
  master_rating: number | null
  created_at: string
  updated_at: string
  master?: Master
  buyer_profile?: Profile
}

// ─── PRICING & SUBSCRIPTIONS ─────────────────────────────────
export type PlanId = 'decouverte' | 'solo' | 'equipe' | 'business' | 'entreprise'
export type BillingCycle = 'monthly' | 'annual'
export type SubStatus = 'pending' | 'active' | 'cancelled' | 'expired'
export type CRMMode = 'readonly' | 'full' | 'advanced'

export type Plan = {
  id: PlanId
  name: string
  price_monthly: number
  price_annual_monthly: number
  credits_per_month: number | null
  max_users: number | null
  rollover_months: number
  max_rollover_credits: number
  csv_export_limit: number | null
  crm_mode: CRMMode
  api_access: boolean
  meetmaster_meetings: number
  support_tier: string
}

export type Subscription = {
  id: string
  user_id: string
  plan_id: PlanId
  billing_cycle: BillingCycle
  status: SubStatus
  current_period_start: string
  current_period_end: string | null
  rollover_credits: number
  notes: string | null
  requested_at: string
  activated_at: string | null
  plan?: Plan
}

export type Organization = {
  id: string
  name: string
  owner_id: string
  subscription_id: string | null
  created_at: string
}

export type OrgMember = {
  id: string
  org_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  status: 'pending' | 'active' | 'removed'
  invite_email: string | null
  invited_at: string
  joined_at: string | null
  profile?: Profile
}

export type CreditPack = {
  id: string
  name: string
  credits: number
  price_mad: number
  price_per_cr: number
  valid_months: number
}

export type PackPurchase = {
  id: string
  user_id: string
  pack_id: string
  credits_purchased: number
  credits_remaining: number
  price_paid: number
  expires_at: string | null
  created_at: string
  pack?: CreditPack
}

export type Invoice = {
  id: string
  user_id: string
  invoice_number: string
  type: 'subscription' | 'topup'
  amount_ht: number
  tva_rate: number
  tva_amount: number
  total_ttc: number
  plan_id: string | null
  pack_id: string | null
  billing_cycle: string | null
  status: 'pending' | 'paid' | 'cancelled'
  period_start: string | null
  period_end: string | null
  notes: string | null
  created_at: string
  paid_at: string | null
}

export type Referral = {
  id: string
  referrer_id: string
  referred_id: string | null
  referral_code: string
  status: 'pending' | 'completed'
  credits_awarded: number
  completed_at: string | null
  created_at: string
}
