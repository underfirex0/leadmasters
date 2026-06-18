'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Crown, Zap, Users, ChevronRight, Copy, Check, RefreshCw, ArrowRight, Star, Shield, Clock } from 'lucide-react'
import { cn, formatDate, formatNumber } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import type { Subscription, Plan, PackPurchase } from '@/types'

const PLAN_COLORS: Record<string, string> = {
  decouverte: 'text-ink-3 bg-surface-2 border-[rgba(0,0,0,0.08)]',
  solo:       'text-brand-700 bg-brand-50 border-brand-100',
  equipe:     'text-violet-700 bg-violet-50 border-violet-100',
  business:   'text-gold-700 bg-gold-50 border-gold-100',
  entreprise: 'text-emerald-700 bg-emerald-50 border-emerald-100',
}

const PLAN_ICONS: Record<string, string> = {
  decouverte: '🌱', solo: '⚡', equipe: '👥', business: '🚀', entreprise: '🏢',
}

export default function AccountPage() {
  const toast = useToast()
  const [data, setData] = useState<{
    profile: Record<string, unknown> | null
    subscription: (Subscription & { plan: Plan }) | null
    packs: PackPurchase[]
    topup_credits: number
  }>({ profile: null, subscription: null, packs: [], topup_credits: 0 })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [referralData, setReferralData] = useState<{ referral_code: string; credits_earned: number; completed: number } | null>(null)
  const [referralCode, setReferralCode] = useState('')
  const [applyingCode, setApplyingCode] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/subscription').then(r => r.json()),
      fetch('/api/referral').then(r => r.json()),
    ]).then(([subData, refData]) => {
      setData(subData)
      setReferralData(refData)
    }).finally(() => setLoading(false))
  }, [])

  function copyCode() {
    navigator.clipboard.writeText(referralData?.referral_code ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Code copié !')
  }

  async function applyReferral() {
    if (!referralCode.trim()) return
    setApplyingCode(true)
    try {
      const res = await fetch('/api/referral', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: referralCode.trim().toUpperCase() }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error); return }
      toast.success(d.message)
      setReferralCode('')
      // Refresh
      const sub = await fetch('/api/subscription').then(r => r.json())
      setData(sub)
    } finally { setApplyingCode(false) }
  }

  const plan = data.subscription?.plan
  const planId = (data.profile?.plan_id as string) ?? 'decouverte'
  const balance = (data.profile?.credit_balance as number) ?? 0
  const monthlyCredits = plan?.credits_per_month ?? (planId === 'decouverte' ? 100 : null)

  if (loading) return (
    <div className="animate-pulse space-y-4 max-w-3xl mx-auto">
      {[1,2,3].map(i => <div key={i} className="h-32 bg-surface-2 rounded-[18px]" />)}
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-reveal-in">
      <div>
        <h1 className="font-bold text-ink-1" style={{ fontSize: '26px', letterSpacing: '-0.8px' }}>Mon compte</h1>
        <p className="text-[14px] text-ink-3 mt-1">Gérez votre plan, crédits et équipe.</p>
      </div>

      {/* Current plan card */}
      <div className={cn('rounded-[20px] border p-7', PLAN_COLORS[planId])}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{PLAN_ICONS[planId]}</span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest opacity-60 mb-0.5">Plan actuel</p>
                <p className="font-bold text-[22px]" style={{ letterSpacing: '-0.5px' }}>
                  Plan {plan?.name ?? 'Découverte'}
                </p>
              </div>
            </div>

            {data.subscription?.status === 'active' && data.subscription.current_period_end && (
              <div className="flex items-center gap-1.5 text-[13px] opacity-70 mt-2">
                <Clock className="w-3.5 h-3.5" />
                Renouvellement le {formatDate(data.subscription.current_period_end)}
                <span className="px-1.5 py-0.5 rounded-pill text-[10px] font-bold bg-black/10">
                  {data.subscription.billing_cycle === 'annual' ? 'Annuel' : 'Mensuel'}
                </span>
              </div>
            )}
            {data.subscription?.status === 'pending' && (
              <div className="flex items-center gap-1.5 text-[12px] mt-2 bg-black/10 rounded-pill px-3 py-1 w-fit">
                <RefreshCw className="w-3 h-3 animate-spin" />
                En attente d&apos;activation — Notre équipe vous contacte sous 24h
              </div>
            )}
          </div>
          <Link href="/account/plan"
            className="flex items-center gap-2 bg-white/80 backdrop-blur hover:bg-white text-ink-1 font-semibold px-4 py-2.5 rounded-pill text-[13px] transition-all shadow-xs">
            Changer de plan <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Plan features quick view */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-black/[0.06]">
          {[
            { icon: Zap,    label: 'Crédits/mois', val: monthlyCredits ? formatNumber(monthlyCredits) : '∞' },
            { icon: Users,  label: 'Utilisateurs',  val: plan?.max_users != null ? plan.max_users.toString() : '∞' },
            { icon: Star,   label: 'Rollover',       val: (plan?.rollover_months ?? 0) > 0 ? `${plan?.rollover_months} mois` : 'Non' },
            { icon: Shield, label: 'Support',        val: plan?.support_tier === 'dedicated' ? 'Dédié' : plan?.support_tier === 'priority' ? 'Prioritaire' : plan?.support_tier === 'email' ? 'Email' : 'FAQ' },
          ].map(({ icon: Icon, label, val }) => (
            <div key={label} className="bg-white/40 rounded-[12px] p-3 text-center">
              <Icon className="w-4 h-4 mx-auto mb-1 opacity-60" />
              <p className="font-bold text-[16px]">{val}</p>
              <p className="text-[11px] opacity-60">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Credits breakdown */}
      <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[20px] p-6 shadow-card">
        <h2 className="font-bold text-[16px] text-ink-1 mb-5" style={{ letterSpacing: '-0.3px' }}>Crédits disponibles</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[8px] bg-brand-50 flex items-center justify-center">
                <span className="text-brand-600 font-bold text-[11px]">◆</span>
              </div>
              <div>
                <p className="font-semibold text-[13px] text-ink-1">Total disponible</p>
                <p className="text-[11px] text-ink-4">Crédits + report + top-ups</p>
              </div>
            </div>
            <p className="font-bold text-[24px] tabular-nums text-ink-1" style={{ letterSpacing: '-1px' }}>{formatNumber(balance)}</p>
          </div>

          {data.subscription?.rollover_credits != null && data.subscription.rollover_credits > 0 && (
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-ink-3 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Crédits reportés</span>
              <span className="font-semibold text-ink-2">+{formatNumber(data.subscription.rollover_credits)}</span>
            </div>
          )}
          {data.topup_credits > 0 && (
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-ink-3 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-gold-500" />Top-ups actifs
              </span>
              <span className="font-semibold text-gold-700">+{formatNumber(data.topup_credits)} cr</span>
            </div>
          )}

          {/* Top-up packs */}
          {data.packs.length > 0 && (
            <div className="pt-2 space-y-2">
              {data.packs.map(p => (
                <div key={p.id} className="flex items-center justify-between text-[12px] bg-gold-50 border border-gold-100 rounded-[10px] px-3 py-2">
                  <span className="text-gold-700 font-medium">{(p.pack as unknown as Record<string, string>)?.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gold-700">{formatNumber(p.credits_remaining)} cr</span>
                    {p.expires_at && <span className="text-gold-500">expire {formatDate(p.expires_at)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <Link href="/wallet" className="flex items-center gap-2 mt-4 text-[13px] font-semibold text-brand-600 hover:text-brand-700 transition-colors">
          Voir l&apos;historique complet <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Referral section */}
      <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[20px] p-6 shadow-card">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-[10px] bg-emerald-50 flex items-center justify-center shrink-0">
            <span className="text-xl">🎁</span>
          </div>
          <div>
            <h2 className="font-bold text-[16px] text-ink-1" style={{ letterSpacing: '-0.3px' }}>Programme de parrainage</h2>
            <p className="text-[13px] text-ink-3 mt-0.5">Invitez un collègue → vous recevez tous les deux 100 crédits.</p>
          </div>
        </div>

        {referralData && (
          <div className="space-y-4">
            <div>
              <p className="text-[12px] font-semibold text-ink-3 uppercase tracking-wide mb-2">Votre code</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-surface-1 border border-[rgba(0,0,0,0.07)] rounded-[10px] px-4 py-3 font-mono font-bold text-[18px] text-ink-1 tracking-widest">
                  {referralData.referral_code}
                </div>
                <button onClick={copyCode}
                  className="w-11 h-11 bg-brand-600 hover:bg-brand-700 text-white rounded-[10px] flex items-center justify-center transition-colors shrink-0">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-1 rounded-[12px] p-3 text-center">
                <p className="font-bold text-[24px] text-ink-1" style={{ letterSpacing: '-1px' }}>{referralData.completed}</p>
                <p className="text-[12px] text-ink-4">Parrainages</p>
              </div>
              <div className="bg-emerald-50 rounded-[12px] p-3 text-center">
                <p className="font-bold text-[24px] text-emerald-700" style={{ letterSpacing: '-1px' }}>+{referralData.credits_earned}</p>
                <p className="text-[12px] text-emerald-600">Crédits gagnés</p>
              </div>
            </div>

            <div className="border-t border-[rgba(0,0,0,0.05)] pt-4">
              <p className="text-[12px] font-semibold text-ink-3 uppercase tracking-wide mb-2">Entrer un code parrainage</p>
              <div className="flex gap-2">
                <input type="text" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())}
                  className="input flex-1 font-mono uppercase tracking-widest text-[14px]" placeholder="CODE PARRAIN" />
                <button onClick={applyReferral} disabled={applyingCode || !referralCode}
                  className="btn-brand px-4 py-2 text-[13px] shrink-0">
                  {applyingCode ? '...' : 'Appliquer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { href: '/account/plan',    label: 'Changer de plan',    sub: 'Comparer et évoluer',  icon: '📋' },
          { href: '/account/billing', label: 'Mes factures',       sub: 'Télécharger les justificatifs', icon: '🧾' },
          { href: '/account/team',    label: 'Mon équipe',         sub: 'Gérer les membres',    icon: '👥' },
          { href: '/wallet',          label: 'Top-up crédits',     sub: 'Packs supplémentaires',icon: '⚡' },
        ].map(({ href, label, sub, icon }) => (
          <Link key={href} href={href}
            className="flex items-center gap-4 p-5 bg-white border border-[rgba(0,0,0,0.07)] rounded-[16px] shadow-card hover:shadow-card-md hover:border-[rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all group">
            <span className="text-2xl">{icon}</span>
            <div className="flex-1">
              <p className="font-semibold text-[14px] text-ink-1">{label}</p>
              <p className="text-[12px] text-ink-3">{sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-ink-5 group-hover:text-ink-1 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  )
}
