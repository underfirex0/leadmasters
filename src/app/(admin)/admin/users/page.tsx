'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Search, Filter, ChevronRight, Crown, Zap,
  CheckCircle, Clock, AlertCircle, Loader2, Plus, X
} from 'lucide-react'
import { cn, formatDate, formatNumber } from '@/lib/utils'
import { useToast } from '@/components/Toast'

const PLAN_STYLES: Record<string, string> = {
  decouverte: 'bg-surface-2 text-ink-3 border-[rgba(0,0,0,0.08)]',
  solo:       'bg-brand-50 text-brand-700 border-brand-100',
  equipe:     'bg-violet-50 text-violet-700 border-violet-100',
  business:   'bg-gold-50 text-gold-700 border-gold-100',
  entreprise: 'bg-emerald-50 text-emerald-700 border-emerald-100',
}

const PLAN_LABELS: Record<string, string> = {
  decouverte: 'Découverte', solo: 'Solo', equipe: 'Équipe', business: 'Business', entreprise: 'Entreprise',
}

type User = {
  id: string; email: string; full_name: string | null
  plan_id: string; credit_balance: number; is_admin: boolean
  created_at: string; referral_code: string | null
  subscription?: { status: string; plan_id: string; current_period_end: string | null; billing_cycle: string } | null
}

// ── Action Modal ──────────────────────────────────────────────
function UserActionModal({ user, onClose, onSuccess }: {
  user: User; onClose: () => void; onSuccess: () => void
}) {
  const toast = useToast()
  const [tab, setTab] = useState<'activate' | 'credits' | 'info'>('info')
  const [planId, setPlanId] = useState(user.plan_id)
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly')
  const [notes, setNotes] = useState('')
  const [credits, setCredits] = useState(100)
  const [reason, setReason] = useState('Crédit manuel admin')
  const [loading, setLoading] = useState(false)

  const PLANS = ['decouverte','solo','equipe','business','entreprise']

  async function doAction(action: string, extra?: Record<string, unknown>) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || 'Erreur'); return }
      toast.success(d.message)
      onSuccess()
      onClose()
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[24px] w-full max-w-lg shadow-card-lg animate-scale-in">
        {/* Header */}
        <div className="px-7 py-5 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
          <div>
            <p className="font-bold text-[16px] text-ink-1">{user.full_name || user.email}</p>
            <p className="text-[12px] text-ink-3">{user.email}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-surface-2 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-ink-3" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 px-7 pt-5">
          {([['info','Infos'],['activate','Activer plan'],['credits','Ajouter crédits']] as [string, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as typeof tab)}
              className={cn('px-4 py-2 text-[13px] font-semibold rounded-lg transition-colors',
                tab === key ? 'bg-brand-50 text-brand-700' : 'text-ink-3 hover:text-ink-1'
              )}>
              {label}
            </button>
          ))}
        </div>

        <div className="px-7 py-5 space-y-4">
          {tab === 'info' && (
            <div className="space-y-3 text-[13px]">
              {[
                { l: 'Plan actuel',    v: PLAN_LABELS[user.plan_id] },
                { l: 'Crédits',       v: `${formatNumber(user.credit_balance)} cr` },
                { l: 'Inscription',   v: formatDate(user.created_at) },
                { l: 'Abonnement',    v: user.subscription?.status || 'Aucun' },
                { l: 'Code parrainage', v: user.referral_code || '—' },
                { l: 'Admin',         v: user.is_admin ? '✓ Oui' : '✗ Non' },
              ].map(({ l, v }) => (
                <div key={l} className="flex justify-between py-2 border-b border-[rgba(0,0,0,0.04)]">
                  <span className="text-ink-3">{l}</span>
                  <span className="font-semibold text-ink-1">{v}</span>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button onClick={() => doAction('toggle_admin')} disabled={loading}
                  className="btn-ghost flex-1 text-sm">
                  {user.is_admin ? 'Retirer admin' : 'Rendre admin'}
                </button>
                {user.subscription?.status === 'active' && (
                  <button onClick={() => doAction('cancel_subscription')} disabled={loading}
                    className="btn-ghost flex-1 text-sm border-red-200 text-red-600 hover:bg-red-50">
                    Annuler l&apos;abonnement
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === 'activate' && (
            <div className="space-y-4">
              <div>
                <label className="label text-[12px]">Plan</label>
                <div className="grid grid-cols-3 gap-2">
                  {PLANS.filter(p => p !== 'decouverte').map(p => (
                    <button key={p} onClick={() => setPlanId(p)}
                      className={cn('py-2 px-3 rounded-[10px] border text-[12px] font-semibold transition-all',
                        planId === p ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-[rgba(0,0,0,0.1)] text-ink-2 hover:border-brand-300')}>
                      {PLAN_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label text-[12px]">Facturation</label>
                <div className="flex gap-2">
                  {['monthly','annual'].map(c => (
                    <button key={c} onClick={() => setCycle(c as typeof cycle)}
                      className={cn('flex-1 py-2 rounded-[10px] border text-[12px] font-semibold transition-all',
                        cycle === c ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-[rgba(0,0,0,0.1)] text-ink-2')}>
                      {c === 'monthly' ? 'Mensuel' : 'Annuel (-20%)'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label text-[12px]">Notes internes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  className="input resize-none text-sm" rows={2} placeholder="Référence paiement, commentaire…" />
              </div>
              <button onClick={() => doAction('activate_plan', { plan_id: planId, billing_cycle: cycle, notes })}
                disabled={loading || planId === 'decouverte'}
                className="btn-brand w-full justify-center flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Activer le plan {PLAN_LABELS[planId]}
              </button>
            </div>
          )}

          {tab === 'credits' && (
            <div className="space-y-4">
              <div>
                <label className="label text-[12px]">Nombre de crédits à ajouter</label>
                <div className="flex gap-2">
                  {[50,100,200,500,1000].map(n => (
                    <button key={n} onClick={() => setCredits(n)}
                      className={cn('flex-1 py-2 rounded-[10px] border text-[12px] font-semibold transition-all',
                        credits === n ? 'bg-gold-600 text-white border-gold-600' : 'bg-white border-[rgba(0,0,0,0.1)] text-ink-2')}>
                      {n}
                    </button>
                  ))}
                </div>
                <input type="number" value={credits} onChange={e => setCredits(parseInt(e.target.value) || 0)}
                  className="input mt-2 text-sm" min={1} max={100000} />
              </div>
              <div>
                <label className="label text-[12px]">Raison</label>
                <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                  className="input text-sm" placeholder="Crédit manuel, compensation, parrainage…" />
              </div>
              <div className="bg-gold-50 border border-gold-100 rounded-[12px] p-3 text-[12px] text-gold-800">
                Solde actuel : <strong>{formatNumber(user.credit_balance)} cr</strong> → après : <strong>{formatNumber(user.credit_balance + credits)} cr</strong>
              </div>
              <button onClick={() => doAction('add_credits', { amount: credits, reason })} disabled={loading || credits <= 0}
                className="btn-gold w-full justify-center flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Ajouter {credits} crédits
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<User | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString() })
      if (search)     params.set('search', search)
      if (planFilter) params.set('plan', planFilter)
      const res = await fetch(`/api/admin/users?${params}`)
      const d = await res.json()
      setUsers(d.users ?? [])
      setTotal(d.total ?? 0)
    } finally { setLoading(false) }
  }, [page, search, planFilter])

  useEffect(() => { load() }, [load])

  const SUB_STATUS = {
    active:  { icon: CheckCircle, color: 'text-emerald-600', label: 'Actif' },
    pending: { icon: Clock,       color: 'text-amber-600',   label: 'En attente' },
    default: { icon: AlertCircle, color: 'text-ink-4',       label: 'Aucun' },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-ink-1" style={{ fontSize: '28px', letterSpacing: '-1px' }}>Utilisateurs</h1>
        <p className="text-[14px] text-ink-3 mt-1">{total} utilisateur{total > 1 ? 's' : ''} au total</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher par nom ou email…"
            className="input pl-10 bg-white text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-ink-4" />
          <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1) }}
            className="select w-auto bg-white text-sm min-w-36">
            <option value="">Tous les plans</option>
            {['decouverte','solo','equipe','business','entreprise'].map(p => (
              <option key={p} value={p}>{PLAN_LABELS[p]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] shadow-card overflow-hidden">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Plan</th>
              <th>Abonnement</th>
              <th>Crédits</th>
              <th>Inscription</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-ink-3"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-ink-3">Aucun utilisateur trouvé.</td></tr>
            ) : users.map(u => {
              const sub = u.subscription
              const subSt = sub?.status === 'active' ? SUB_STATUS.active : sub?.status === 'pending' ? SUB_STATUS.pending : SUB_STATUS.default
              const SubIcon = subSt.icon
              return (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-brand-700 font-bold text-[11px]">
                          {((u.full_name || u.email || 'U')[0]).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-[13px] text-ink-1">{u.full_name || '—'}</p>
                        <p className="text-[11px] text-ink-4 truncate max-w-[160px]">{u.email}</p>
                      </div>
                      {u.is_admin && <Crown className="w-3.5 h-3.5 text-gold-500" />}
                    </div>
                  </td>
                  <td>
                    <span className={cn('badge border text-[10px]', PLAN_STYLES[u.plan_id])}>
                      {PLAN_LABELS[u.plan_id]}
                    </span>
                  </td>
                  <td>
                    <div className={cn('flex items-center gap-1.5 text-[12px] font-medium', subSt.color)}>
                      <SubIcon className="w-3.5 h-3.5" />
                      {subSt.label}
                      {sub?.current_period_end && (
                        <span className="text-ink-4 font-normal">· {formatDate(sub.current_period_end)}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 text-[13px] font-bold text-ink-1">
                      <Zap className="w-3.5 h-3.5 text-gold-500" />
                      {formatNumber(u.credit_balance)}
                    </div>
                  </td>
                  <td className="text-[12px] text-ink-3">{formatDate(u.created_at)}</td>
                  <td>
                    <button onClick={() => setSelected(u)}
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-[8px] transition-colors">
                      Gérer <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 20 && (
          <div className="px-6 py-4 border-t border-[rgba(0,0,0,0.05)] flex items-center justify-between">
            <p className="text-[12px] text-ink-3">Page {page} sur {Math.ceil(total / 20)}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="btn-ghost btn-sm disabled:opacity-40">←</button>
              <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}
                className="btn-ghost btn-sm disabled:opacity-40">→</button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <UserActionModal user={selected} onClose={() => setSelected(null)} onSuccess={() => { setSelected(null); load() }} />
      )}
    </div>
  )
}
