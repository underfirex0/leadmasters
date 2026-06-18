'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Loader2, X, ChevronRight, Zap } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { useToast } from '@/components/Toast'

const PLANS = [
  {
    id: 'decouverte', name: 'Découverte', emoji: '🌱',
    price_m: 0, price_a: 0, credits: 100, users: 1, rollover: 0, csvLimit: 5, crm: 'readonly',
    badge: null, color: 'border-[rgba(0,0,0,0.08)]',
    features: ['100 crédits one-time','1 utilisateur','Export CSV 5 lignes','CRM lecture seule','Support FAQ'],
    missing: ['Crédits mensuels','Rollover','Export illimité','CRM complet','Support email'],
  },
  {
    id: 'solo', name: 'Solo', emoji: '⚡',
    price_m: 149, price_a: 119, credits: 400, users: 1, rollover: 1, csvLimit: 100, crm: 'full',
    badge: null, color: 'border-brand-200',
    features: ['400 crédits/mois','1 utilisateur','Report 1 mois (400 cr max)','Export CSV 100 lignes','CRM complet','Support email 48h'],
    missing: ['Multi-utilisateurs','Export illimité'],
  },
  {
    id: 'equipe', name: 'Équipe', emoji: '👥',
    price_m: 390, price_a: 299, credits: 1500, users: 3, rollover: 2, csvLimit: null, crm: 'full',
    badge: 'Populaire', color: 'border-violet-300',
    features: ['1 500 crédits/mois','3 utilisateurs','Report 2 mois (1 500 cr max)','Export CSV illimité','CRM + pipeline & tags','Intégrations HubSpot / CSV','Support prioritaire 24h'],
    missing: ['API & Webhooks','Analytics équipe'],
  },
  {
    id: 'business', name: 'Business', emoji: '🚀',
    price_m: 990, price_a: 790, credits: 5000, users: 10, rollover: 3, csvLimit: null, crm: 'advanced',
    badge: 'Meilleur ROI', color: 'border-gold-300',
    features: ['5 000 crédits/mois','10 utilisateurs','Report 3 mois (5 000 cr max)','Export CSV illimité + auto','CRM avancé + analytics équipe','API & Webhooks','Toutes intégrations CRM','1 meeting MeetMaster offert/mois','Support dédié 4h'],
    missing: [],
  },
  {
    id: 'entreprise', name: 'Entreprise', emoji: '🏢',
    price_m: null, price_a: null, credits: null, users: null, rollover: 0, csvLimit: null, crm: 'advanced',
    badge: null, color: 'border-emerald-200',
    features: ['Crédits illimités','Utilisateurs illimités','SLA 99.5% garanti','API volume élevé','Onboarding personnalisé (3 sessions)','Manager de compte dédié','Facturation flexible'],
    missing: [],
  },
]

type PlanRow = typeof PLANS[0]
type FmtFn = (v: unknown, plan: PlanRow) => string

const FEATURE_COMPARE: { label: string; fmt: FmtFn }[] = [
  { label: 'Crédits/mois',   fmt: (_v, p) => p.credits ? formatNumber(p.credits) : '∞' },
  { label: 'Utilisateurs',   fmt: (_v, p) => p.users ? p.users.toString() : '∞' },
  { label: 'Rollover',       fmt: (_v, p) => p.rollover > 0 ? `${p.rollover} mois` : '✗' },
  { label: 'Export CSV',     fmt: (_v, p) => p.csvLimit === 5 ? '5 lignes' : p.csvLimit === 100 ? '100 lignes' : '∞' },
  { label: 'CRM',            fmt: (_v, p) => p.crm === 'readonly' ? 'Lecture' : p.crm === 'advanced' ? 'Avancé' : 'Complet' },
  { label: 'API & Webhooks', fmt: (_v, p) => ['business','entreprise'].includes(p.id) ? '✓' : '✗' },
  { label: 'Support',        fmt: (_v, p) => ({ decouverte:'FAQ', solo:'Email', equipe:'Prioritaire', business:'Dédié 4h', entreprise:'Dédié' }[p.id] ?? '') },
]

export default function PlanPage() {
  const toast = useToast()
  const [annual, setAnnual] = useState(false)
  const [currentPlanId, setCurrentPlanId] = useState<string>('decouverte')
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<{ planId: string; price: number } | null>(null)

  useEffect(() => {
    fetch('/api/subscription').then(r => r.json()).then(d => {
      setCurrentPlanId((d.profile?.plan_id as string) ?? 'decouverte')
    }).finally(() => setLoading(false))
  }, [])

  async function handleUpgrade(planId: string) {
    if (planId === 'entreprise') {
      window.location.href = 'mailto:contact@leadscout.ma?subject=Demande plan Entreprise'
      return
    }
    const plan = PLANS.find(p => p.id === planId)
    const price = annual ? (plan?.price_a ?? 0) * 12 : (plan?.price_m ?? 0)
    if (planId === 'decouverte') {
      setShowConfirm({ planId, price: 0 })
      return
    }
    setShowConfirm({ planId, price })
  }

  async function confirmUpgrade() {
    if (!showConfirm) return
    setUpgrading(showConfirm.planId)
    try {
      const res = await fetch('/api/subscription/upgrade', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: showConfirm.planId, billing_cycle: annual ? 'annual' : 'monthly' }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || 'Erreur'); return }
      toast.success(d.message)
      setCurrentPlanId(showConfirm.planId)
      setShowConfirm(null)
      if (showConfirm.planId === 'decouverte') window.location.href = '/account'
    } finally {
      setUpgrading(null)
    }
  }

  const tva = (price: number) => Math.round(price * 0.20)

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-reveal-in">
      <div className="flex items-center gap-3">
        <Link href="/account" className="btn-ghost text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
      </div>

      <div className="text-center">
        <h1 className="font-bold text-ink-1 mb-3" style={{ fontSize: 'clamp(28px,4vw,40px)', letterSpacing: '-1.5px' }}>
          Choisissez votre plan
        </h1>
        <p className="text-[15px] text-ink-3 mb-6">Commencez gratuitement. Évoluez à votre rythme.</p>

        {/* Annual toggle */}
        <div className="inline-flex items-center gap-3 bg-surface-1 border border-[rgba(0,0,0,0.07)] rounded-pill p-1">
          <button onClick={() => setAnnual(false)}
            className={cn('px-4 py-2 rounded-pill text-sm font-semibold transition-all', !annual ? 'bg-white text-ink-1 shadow-xs' : 'text-ink-3')}>
            Mensuel
          </button>
          <button onClick={() => setAnnual(true)}
            className={cn('px-4 py-2 rounded-pill text-sm font-semibold transition-all flex items-center gap-1.5', annual ? 'bg-white text-ink-1 shadow-xs' : 'text-ink-3')}>
            Annuel
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-pill">-20%</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
        {PLANS.map(plan => {
          const isCurrent = plan.id === currentPlanId
          const price = annual ? plan.price_a : plan.price_m
          const isUpgrade = !isCurrent && plan.price_m !== null && plan.price_m > (PLANS.find(p => p.id === currentPlanId)?.price_m ?? 0)
          const isDowngrade = !isCurrent && !isUpgrade && plan.id !== currentPlanId

          return (
            <div key={plan.id}
              className={cn(
                'rounded-[20px] border p-5 flex flex-col transition-all',
                plan.id === 'equipe' ? 'ring-2 ring-violet-300 shadow-[0_8px_32px_rgba(139,92,246,0.12)]' : 'shadow-card',
                isCurrent ? 'bg-surface-1' : 'bg-white',
                plan.color,
              )}>
              {plan.badge && (
                <div className={cn(
                  'text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-pill w-fit mb-3',
                  plan.id === 'equipe' ? 'bg-violet-100 text-violet-700' : 'bg-gold-100 text-gold-700'
                )}>{plan.badge}</div>
              )}
              {isCurrent && <div className="text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-3">Plan actuel</div>}

              <div className="text-2xl mb-2">{plan.emoji}</div>
              <p className="font-bold text-ink-1 text-[16px] mb-1">{plan.name}</p>

              <div className="mb-4">
                {price === null ? (
                  <p className="font-bold text-ink-1 text-[20px]" style={{ letterSpacing: '-0.5px' }}>Sur devis</p>
                ) : price === 0 ? (
                  <p className="font-bold text-ink-1 text-[24px]" style={{ letterSpacing: '-0.5px' }}>Gratuit</p>
                ) : (
                  <div>
                    <span className="font-bold text-ink-1 text-[22px] tabular-nums" style={{ letterSpacing: '-0.5px' }}>
                      {price}
                    </span>
                    <span className="text-ink-3 text-[12px]"> MAD{annual ? '/mois (annuel)' : '/mois'}</span>
                  </div>
                )}
                {plan.credits && (
                  <p className="text-[12px] text-ink-3 mt-0.5 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-gold-500" />
                    {formatNumber(plan.credits)} crédits/mois
                  </p>
                )}
              </div>

              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-1.5 text-[12px] text-ink-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
                {plan.missing.slice(0, 2).map(f => (
                  <li key={f} className="flex items-start gap-1.5 text-[12px] text-ink-5 line-through">
                    <X className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={2} />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button disabled className="w-full py-2.5 rounded-pill text-[13px] font-semibold bg-surface-2 text-ink-4 cursor-default border border-[rgba(0,0,0,0.07)]">
                  Plan actuel
                </button>
              ) : plan.id === 'entreprise' ? (
                <button onClick={() => handleUpgrade('entreprise')}
                  className="w-full py-2.5 rounded-pill text-[13px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                  Nous contacter →
                </button>
              ) : (
                <button onClick={() => handleUpgrade(plan.id)} disabled={upgrading === plan.id}
                  className={cn('w-full py-2.5 rounded-pill text-[13px] font-semibold transition-all',
                    plan.id === 'equipe' ? 'bg-violet-600 text-white hover:bg-violet-700' :
                    plan.id === 'business' ? 'bg-gold-600 text-white hover:bg-gold-700' :
                    isDowngrade ? 'bg-surface-2 text-ink-2 hover:bg-surface-3 border border-[rgba(0,0,0,0.08)]' :
                    'bg-brand-600 text-white hover:bg-brand-700'
                  )}>
                  {upgrading === plan.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> :
                    plan.price_m === 0 ? 'Passer au gratuit' :
                    isDowngrade ? `Rétrograder` : `Choisir ${plan.name}`
                  }
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Features comparison table */}
      <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[20px] shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.05)]">
          <p className="font-bold text-[15px] text-ink-1">Comparaison détaillée</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-1">
                <th className="text-left px-5 py-3 text-[12px] font-semibold text-ink-4 w-40">Fonctionnalité</th>
                {PLANS.map(p => (
                  <th key={p.id} className={cn('px-4 py-3 text-[12px] font-bold text-center',
                    p.id === currentPlanId ? 'text-brand-700 bg-brand-50' : 'text-ink-2')}>
                    {p.emoji} {p.name}
                    {p.id === currentPlanId && <div className="text-[10px] font-medium text-brand-500 mt-0.5">actuel</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_COMPARE.map(({ label, fmt }) => (
                <tr key={label} className="border-t border-[rgba(0,0,0,0.04)]">
                  <td className="px-5 py-3 text-[13px] font-medium text-ink-2">{label}</td>
                  {PLANS.map(p => {
                    const val = fmt(null, p)
                    return (
                      <td key={p.id} className={cn('px-4 py-3 text-[13px] text-center font-semibold',
                        val === '✓' ? 'text-emerald-600' : val === '✗' ? 'text-ink-5' : 'text-ink-2',
                        p.id === currentPlanId ? 'bg-brand-50/30' : ''
                      )}>
                        {val}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[24px] p-7 max-w-md w-full shadow-card-lg animate-scale-in">
            {showConfirm.planId === 'decouverte' ? (
              <>
                <h3 className="font-bold text-[20px] text-ink-1 mb-2" style={{ letterSpacing: '-0.5px' }}>Rétrograder vers Gratuit ?</h3>
                <p className="text-[14px] text-ink-3 mb-6">Vous perdrez votre abonnement actuel et vos crédits mensuels à la fin de la période.</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowConfirm(null)} className="btn-ghost flex-1">Annuler</button>
                  <button onClick={confirmUpgrade} disabled={!!upgrading}
                    className="btn-primary flex-1 bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2">
                    {upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Confirmer
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-bold text-[20px] text-ink-1 mb-1" style={{ letterSpacing: '-0.5px' }}>
                  {PLANS.find(p => p.id === showConfirm.planId)?.emoji} Plan {PLANS.find(p => p.id === showConfirm.planId)?.name}
                </h3>
                <p className="text-[13px] text-ink-3 mb-5">Sans passerelle de paiement, nous vous envoyons une facture par email. Notre équipe active votre plan sous 24h après réception du virement.</p>

                <div className="bg-surface-1 rounded-[14px] p-4 mb-5 space-y-2 text-[13px]">
                  <div className="flex justify-between"><span className="text-ink-3">Montant HT</span><span className="font-semibold">{formatNumber(showConfirm.price)} MAD</span></div>
                  <div className="flex justify-between"><span className="text-ink-3">TVA 20%</span><span className="font-semibold">{formatNumber(tva(showConfirm.price))} MAD</span></div>
                  <div className="flex justify-between border-t border-[rgba(0,0,0,0.06)] pt-2"><span className="font-bold text-ink-1">Total TTC</span><span className="font-bold text-brand-700 text-[16px]">{formatNumber(showConfirm.price + tva(showConfirm.price))} MAD</span></div>
                  {annual && <p className="text-[11px] text-ink-4">Facturation annuelle — économisez 20%</p>}
                </div>

                <p className="text-[12px] text-ink-4 bg-amber-50 border border-amber-100 rounded-[10px] p-3 mb-5">
                  📧 Une facture sera envoyée à votre adresse email. Paiement par virement bancaire ou chèque à l&apos;ordre de LeadScout.
                </p>

                <div className="flex gap-3">
                  <button onClick={() => setShowConfirm(null)} className="btn-ghost flex-1">Annuler</button>
                  <button onClick={confirmUpgrade} disabled={!!upgrading}
                    className="btn-brand flex-1 flex items-center justify-center gap-2">
                    {upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    Demander ce plan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
