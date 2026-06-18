'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CheckCircle, XCircle, Clock, AlertCircle,
  Loader2, ChevronDown, Search, Filter, Crown, CreditCard
} from 'lucide-react'
import { cn, formatDate, formatNumber } from '@/lib/utils'
import { useToast } from '@/components/Toast'

const PLAN_COLORS: Record<string, string> = {
  solo:       'bg-brand-50 text-brand-700 border-brand-100',
  equipe:     'bg-violet-50 text-violet-700 border-violet-100',
  business:   'bg-gold-50 text-gold-700 border-gold-100',
  entreprise: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  decouverte: 'bg-surface-2 text-ink-3 border-[rgba(0,0,0,0.08)]',
}
const PLAN_LABELS: Record<string, string> = {
  decouverte:'Découverte', solo:'Solo', equipe:'Équipe', business:'Business', entreprise:'Entreprise',
}
const PLAN_PRICES: Record<string, Record<string, number>> = {
  solo: { monthly: 149, annual: 119 * 12 },
  equipe: { monthly: 390, annual: 299 * 12 },
  business: { monthly: 990, annual: 790 * 12 },
}

type Sub = {
  id: string; user_id: string; plan_id: string; billing_cycle: string
  status: string; requested_at: string; activated_at: string | null
  cancelled_at: string | null; current_period_end: string | null; notes: string | null
  plan: { name: string; price_monthly: number; credits_per_month: number | null } | null
  profile: { email: string; full_name: string | null; credit_balance: number } | null
}

function ActivateModal({ sub, onClose, onSuccess }: { sub: Sub; onClose: () => void; onSuccess: () => void }) {
  const toast = useToast()
  const [payRef, setPayRef] = useState('')
  const [notes, setNotes]   = useState('')
  const [loading, setLoading] = useState(false)

  const price = PLAN_PRICES[sub.plan_id]?.[sub.billing_cycle === 'annual' ? 'annual' : 'monthly'] ?? 0
  const tva   = Math.round(price * 0.20)

  async function activate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/${sub.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', payment_ref: payRef, notes }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error); return }
      toast.success(d.message)
      onSuccess(); onClose()
    } finally { setLoading(false) }
  }

  async function reject() {
    if (!confirm('Rejeter cette demande ?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/${sub.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', notes }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error); return }
      toast.success(d.message)
      onSuccess(); onClose()
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[24px] w-full max-w-md shadow-card-lg animate-scale-in">
        <div className="px-7 py-5 border-b border-[rgba(0,0,0,0.06)]">
          <p className="font-bold text-[17px] text-ink-1">Activer l&apos;abonnement</p>
          <p className="text-[13px] text-ink-3 mt-0.5">{sub.profile?.full_name || sub.profile?.email}</p>
        </div>

        <div className="px-7 py-5 space-y-4">
          {/* Plan details */}
          <div className="bg-surface-1 rounded-[14px] p-4 space-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-ink-3">Plan</span>
              <span className={cn('font-bold px-2 py-0.5 rounded-pill border text-[11px]', PLAN_COLORS[sub.plan_id])}>
                {PLAN_LABELS[sub.plan_id]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-3">Facturation</span>
              <span className="font-semibold">{sub.billing_cycle === 'annual' ? 'Annuelle' : 'Mensuelle'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-3">Crédits offerts</span>
              <span className="font-semibold text-brand-700">{sub.plan?.credits_per_month ? `${formatNumber(sub.plan.credits_per_month)} cr` : '∞'}</span>
            </div>
            <div className="border-t border-[rgba(0,0,0,0.06)] pt-2 flex justify-between">
              <span className="text-ink-3">Montant HT</span>
              <span className="font-semibold">{formatNumber(price)} MAD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-3">TVA 20%</span>
              <span className="font-semibold">{formatNumber(tva)} MAD</span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-ink-1">Total TTC</span>
              <span className="text-brand-700 text-[15px]">{formatNumber(price + tva)} MAD</span>
            </div>
          </div>

          <div>
            <label className="label text-[12px]">Référence de paiement <span className="text-ink-4 font-normal">(optionnel)</span></label>
            <input type="text" value={payRef} onChange={e => setPayRef(e.target.value)}
              className="input text-sm" placeholder="N° virement, chèque, transaction…" />
          </div>

          <div>
            <label className="label text-[12px]">Notes internes <span className="text-ink-4 font-normal">(optionnel)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              className="input text-sm resize-none" rows={2} placeholder="Commentaire pour l'équipe…" />
          </div>
        </div>

        <div className="px-7 pb-6 flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm">Annuler</button>
          <button onClick={reject} disabled={loading}
            className="btn-ghost flex-1 text-sm border-red-200 text-red-600 hover:bg-red-50">
            Rejeter
          </button>
          <button onClick={activate} disabled={loading}
            className="btn-brand flex-1 text-sm flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Activer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminSubscriptionsPage() {
  const toast = useToast()
  const searchParams = useSearchParams()
  const [subs, setSubs]    = useState<Sub[]>([])
  const [summary, setSummary] = useState({ pending: 0, active: 0, cancelled: 0 })
  const [total, setTotal]  = useState(0)
  const [page, setPage]    = useState(1)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [activating, setActivating] = useState<Sub | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString() })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/admin/subscriptions?${params}`)
      const d = await res.json()
      setSubs(d.subscriptions ?? [])
      setTotal(d.total ?? 0)
      setSummary(d.summary ?? { pending: 0, active: 0, cancelled: 0 })
    } finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { load() }, [load])

  async function cancelSub(sub: Sub) {
    if (!confirm(`Annuler l'abonnement de ${sub.profile?.email} ?`)) return
    setCancelling(sub.id)
    try {
      const res = await fetch(`/api/admin/subscriptions/${sub.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error); return }
      toast.success(d.message); load()
    } finally { setCancelling(null) }
  }

  const STATUS_CONFIG = {
    pending:   { label: 'En attente', icon: Clock,         color: 'text-amber-700 bg-amber-50 border-amber-200' },
    active:    { label: 'Actif',      icon: CheckCircle,   color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    cancelled: { label: 'Annulé',     icon: XCircle,       color: 'text-red-600 bg-red-50 border-red-200' },
    expired:   { label: 'Expiré',     icon: AlertCircle,   color: 'text-ink-4 bg-surface-2 border-[rgba(0,0,0,0.1)]' },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-ink-1" style={{ fontSize: '26px', letterSpacing: '-0.8px' }}>Abonnements</h1>
        <p className="text-[14px] text-ink-3 mt-1">Gérez les demandes et abonnements actifs.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'En attente', count: summary.pending, color: summary.pending > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-[rgba(0,0,0,0.07)]', text: summary.pending > 0 ? 'text-red-700' : 'text-ink-1', filter: 'pending' },
          { label: 'Actifs',     count: summary.active,  color: 'bg-white border-[rgba(0,0,0,0.07)]', text: 'text-emerald-700', filter: 'active' },
          { label: 'Annulés',    count: summary.cancelled, color: 'bg-white border-[rgba(0,0,0,0.07)]', text: 'text-ink-3', filter: 'cancelled' },
        ].map(({ label, count, color, text, filter }) => (
          <button key={label} onClick={() => { setStatusFilter(statusFilter === filter ? '' : filter); setPage(1) }}
            className={cn('rounded-[16px] border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-card', color,
              statusFilter === filter && 'ring-2 ring-brand-400')}>
            <p className="text-[12px] text-ink-3 mb-2">{label}</p>
            <p className={cn('font-bold tabular-nums', text)} style={{ fontSize: '32px', letterSpacing: '-1.5px' }}>{count}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="flex gap-1.5 bg-surface-2 p-1 rounded-[10px]">
          {[{v:'',l:'Tous'},{v:'pending',l:'En attente'},{v:'active',l:'Actifs'},{v:'cancelled',l:'Annulés'}].map(({v,l}) => (
            <button key={v} onClick={() => { setStatusFilter(v); setPage(1) }}
              className={cn('px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all',
                statusFilter === v ? 'bg-white text-ink-1 shadow-xs' : 'text-ink-3 hover:text-ink-1')}>
              {l}
              {v === 'pending' && summary.pending > 0 && (
                <span className="ml-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full inline-flex items-center justify-center">
                  {summary.pending}
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-ink-4 ml-2">{total} abonnement{total > 1 ? 's' : ''}</p>
      </div>

      {/* Table */}
      <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
          </div>
        ) : subs.length === 0 ? (
          <div className="py-16 text-center">
            <CreditCard className="w-8 h-8 text-ink-5 mx-auto mb-3" />
            <p className="text-[14px] text-ink-3">Aucun abonnement{statusFilter ? ` (${statusFilter})` : ''}</p>
          </div>
        ) : (
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Plan</th>
                <th>Facturation</th>
                <th>Statut</th>
                <th>Date demande</th>
                <th>Période fin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.map(sub => {
                const stCfg = STATUS_CONFIG[sub.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.expired
                const StIcon = stCfg.icon
                return (
                  <tr key={sub.id}>
                    <td>
                      <div>
                        <p className="font-semibold text-[13px] text-ink-1">{sub.profile?.full_name || '—'}</p>
                        <p className="text-[11px] text-ink-4">{sub.profile?.email}</p>
                      </div>
                    </td>
                    <td>
                      <span className={cn('text-[11px] font-bold px-2 py-1 rounded-pill border', PLAN_COLORS[sub.plan_id])}>
                        {PLAN_LABELS[sub.plan_id]}
                      </span>
                    </td>
                    <td className="text-[13px] text-ink-2 capitalize">
                      {sub.billing_cycle === 'annual' ? 'Annuelle (-20%)' : 'Mensuelle'}
                    </td>
                    <td>
                      <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-pill border', stCfg.color)}>
                        <StIcon className="w-3 h-3" />{stCfg.label}
                      </span>
                    </td>
                    <td className="text-[12px] text-ink-3">{formatDate(sub.requested_at)}</td>
                    <td className="text-[12px] text-ink-3">
                      {sub.current_period_end ? formatDate(sub.current_period_end) : '—'}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {sub.status === 'pending' && (
                          <button onClick={() => setActivating(sub)}
                            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors">
                            <CheckCircle className="w-3.5 h-3.5" /> Activer
                          </button>
                        )}
                        {sub.status === 'active' && (
                          <button onClick={() => cancelSub(sub)} disabled={cancelling === sub.id}
                            className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[12px] font-semibold px-3 py-1.5 rounded-[8px] border border-red-200 transition-colors">
                            {cancelling === sub.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            Annuler
                          </button>
                        )}
                        {sub.notes && (
                          <span title={sub.notes} className="text-[11px] text-ink-4 px-2 py-1.5 cursor-help">📝</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {total > 25 && (
          <div className="px-6 py-4 border-t border-[rgba(0,0,0,0.05)] flex items-center justify-between">
            <p className="text-[12px] text-ink-3">Page {page} / {Math.ceil(total / 25)}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-ghost btn-sm disabled:opacity-40">←</button>
              <button disabled={page * 25 >= total} onClick={() => setPage(p => p + 1)} className="btn-ghost btn-sm disabled:opacity-40">→</button>
            </div>
          </div>
        )}
      </div>

      {activating && (
        <ActivateModal sub={activating} onClose={() => setActivating(null)} onSuccess={load} />
      )}
    </div>
  )
}
