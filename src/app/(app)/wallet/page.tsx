import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TrendingDown, TrendingUp, Gift, Plus, ArrowRight } from 'lucide-react'
import { formatDate, formatNumber } from '@/lib/utils'
import type { CreditTransaction } from '@/types'
import { cn } from '@/lib/utils'

const TX_CONFIG = {
  grant:    { label: 'Bonus',           color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', icon: Gift },
  query:    { label: 'Recherche',       color: 'text-red-500',     bg: 'bg-red-50 border-red-100',         icon: TrendingDown },
  unlock:   { label: 'Déverrouillage',  color: 'text-orange-500',  bg: 'bg-orange-50 border-orange-100',   icon: TrendingDown },
  refund:   { label: 'Remboursement',   color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100',       icon: TrendingUp },
  purchase: { label: 'Achat',           color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', icon: Plus },
}

export default async function WalletPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: transactions }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('credit_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
  ])

  const spent    = transactions?.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0) ?? 0
  const received = transactions?.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0) ?? 0

  return (
    <div className="space-y-6 max-w-[900px] mx-auto animate-reveal-in">
      <div>
        <h1 className="font-bold text-ink-1" style={{ fontSize: '26px', letterSpacing: '-0.8px' }}>Mes crédits</h1>
        <p className="text-[14px] text-ink-3 mt-1">Historique de vos transactions.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Solde actuel',   value: formatNumber(profile?.credit_balance ?? 0), note: 'crédits disponibles', pos: true  },
          { label: 'Total reçus',    value: `+${formatNumber(received)}`,               note: 'crédits reçus',       pos: true  },
          { label: 'Total dépensés', value: `-${formatNumber(spent)}`,                  note: 'crédits utilisés',    pos: false },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] p-6 shadow-card">
            <p className="text-[12px] font-medium text-ink-3 mb-3">{s.label}</p>
            <p className={cn('font-bold tabular-nums mb-0.5', s.pos ? 'text-ink-1' : 'text-red-500')}
              style={{ fontSize: '28px', letterSpacing: '-1px', lineHeight: 1 }}>
              {s.value}
            </p>
            <p className="text-[12px] text-ink-4">{s.note}</p>
          </div>
        ))}
      </div>

      {/* Add credits */}
      <div className="bg-brand-600 rounded-[20px] p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div>
          <h3 className="font-bold text-white text-[17px] mb-1" style={{ letterSpacing: '-0.3px' }}>Besoin de plus de crédits ?</h3>
          <p className="text-[13px] text-brand-200">Rechargez votre compte. Tarifs flexibles sans abonnement.</p>
        </div>
        <a href="mailto:contact@leadscout.ma?subject=Rechargement crédits"
          className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-5 py-2.5 rounded-pill text-[13px] hover:bg-brand-50 transition-colors whitespace-nowrap shadow-sm">
          Recharger mes crédits <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      {/* Packs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { name: 'Starter',    credits: 500,   price: '149 MAD' },
          { name: 'Growth',     credits: 2000,  price: '499 MAD' },
          { name: 'Pro',        credits: 10000, price: '1 990 MAD' },
          { name: 'Enterprise', credits: null,  price: 'Sur devis' },
        ].map(p => (
          <div key={p.name} className="bg-surface-1 border border-[rgba(0,0,0,0.07)] rounded-[14px] p-4 text-center hover:shadow-card hover:border-[rgba(0,0,0,0.1)] transition-all">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-4 mb-1">{p.name}</p>
            <p className="font-bold text-ink-1 tabular-nums text-xl mb-0.5" style={{ letterSpacing: '-0.5px' }}>
              {p.credits ? formatNumber(p.credits) : '∞'}
            </p>
            <p className="text-[11px] text-ink-4 mb-2">crédits</p>
            <p className="text-[13px] font-bold text-brand-600">{p.price}</p>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.05)]">
          <p className="font-semibold text-[14px] text-ink-1">Historique des transactions</p>
        </div>
        {!transactions?.length ? (
          <div className="px-6 py-12 text-center text-[13px] text-ink-3">Aucune transaction pour l&apos;instant.</div>
        ) : (
          <div className="divide-y divide-[rgba(0,0,0,0.04)]">
            {(transactions as CreditTransaction[]).map(tx => {
              const cfg = TX_CONFIG[tx.type] ?? TX_CONFIG.grant
              const Icon = cfg.icon
              return (
                <div key={tx.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-surface-1/60 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-8 h-8 rounded-[9px] border flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-ink-1">{tx.description || cfg.label}</p>
                      <p className="text-[11px] text-ink-4">{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn('text-[13px] font-bold font-mono', tx.amount > 0 ? 'text-emerald-600' : 'text-red-500')}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </p>
                    <p className="text-[11px] text-ink-4">→ {formatNumber(tx.balance_after)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
