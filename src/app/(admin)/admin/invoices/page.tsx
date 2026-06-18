'use client'
import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, Clock, XCircle, Loader2, FileText, Download } from 'lucide-react'
import { cn, formatDate, formatNumber } from '@/lib/utils'
import { useToast } from '@/components/Toast'

type Invoice = {
  id: string; user_id: string; invoice_number: string; type: string
  amount_ht: number; tva_amount: number; total_ttc: number
  status: string; created_at: string; paid_at: string | null; notes: string | null
  plan_id: string | null; pack_id: string | null; billing_cycle: string | null
  profile: { email: string; full_name: string | null } | null
}

const STATUS = {
  pending:   { label: 'En attente', icon: Clock,        color: 'text-amber-700 bg-amber-50 border-amber-200' },
  paid:      { label: 'Payée',      icon: CheckCircle,  color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  cancelled: { label: 'Annulée',    icon: XCircle,      color: 'text-red-600 bg-red-50 border-red-200' },
}

export default function AdminInvoicesPage() {
  const toast = useToast()
  const [invoices, setInvoices]  = useState<Invoice[]>([])
  const [summary, setSummary]    = useState({ pending_count: 0, pending_total: 0, paid_total: 0 })
  const [total, setTotal]        = useState(0)
  const [page, setPage]          = useState(1)
  const [loading, setLoading]    = useState(true)
  const [statusFilter, setStatus] = useState('')
  const [acting, setActing]      = useState<string | null>(null)
  const [payRef, setPayRef]      = useState('')
  const [showPayModal, setShowPayModal] = useState<Invoice | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString() })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/admin/invoices?${params}`)
      const d = await res.json()
      setInvoices(d.invoices ?? [])
      setTotal(d.total ?? 0)
      setSummary(d.summary ?? { pending_count: 0, pending_total: 0, paid_total: 0 })
    } finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { load() }, [load])

  async function doAction(invoiceId: string, action: string, notes?: string) {
    setActing(invoiceId)
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error); return }
      toast.success(d.message); load()
    } finally { setActing(null) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-ink-1" style={{ fontSize: '26px', letterSpacing: '-0.8px' }}>Factures</h1>
        <p className="text-[14px] text-ink-3 mt-1">Gérez les factures et suivez les paiements.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'En attente', amount: summary.pending_total, count: `${summary.pending_count} facture${summary.pending_count > 1 ? 's' : ''}`, color: summary.pending_count > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-[rgba(0,0,0,0.07)]', text: 'text-amber-700' },
          { label: 'Payées (total)', amount: summary.paid_total, count: '', color: 'bg-white border-[rgba(0,0,0,0.07)]', text: 'text-emerald-700' },
          { label: 'Total factures', amount: 0, count: `${total} factures`, color: 'bg-white border-[rgba(0,0,0,0.07)]', text: 'text-ink-1', isCount: true },
        ].map(({ label, amount, count, color, text, isCount }) => (
          <div key={label} className={cn('rounded-[16px] border p-5', color)}>
            <p className="text-[12px] text-ink-3 mb-2">{label}</p>
            {isCount
              ? <p className={cn('font-bold tabular-nums', text)} style={{ fontSize: '32px', letterSpacing: '-1.5px' }}>{total}</p>
              : <p className={cn('font-bold tabular-nums', text)} style={{ fontSize: '24px', letterSpacing: '-1px' }}>{formatNumber(amount)} MAD</p>
            }
            {count && <p className="text-[11px] text-ink-4 mt-1">{count}</p>}
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 bg-surface-2 p-1 rounded-[10px] w-fit">
        {[{v:'',l:'Toutes'},{v:'pending',l:'En attente'},{v:'paid',l:'Payées'},{v:'cancelled',l:'Annulées'}].map(({v,l}) => (
          <button key={v} onClick={() => { setStatus(v); setPage(1) }}
            className={cn('px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all',
              statusFilter === v ? 'bg-white text-ink-1 shadow-xs' : 'text-ink-3 hover:text-ink-1')}>
            {l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-8 h-8 text-ink-5 mx-auto mb-3" />
            <p className="text-[14px] text-ink-3">Aucune facture</p>
          </div>
        ) : (
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>N° Facture</th>
                <th>Client</th>
                <th>Type</th>
                <th>Montant TTC</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const st = STATUS[inv.status as keyof typeof STATUS] ?? STATUS.pending
                const StIcon = st.icon
                return (
                  <tr key={inv.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-ink-4" />
                        <span className="font-mono text-[12px] font-semibold text-ink-1">{inv.invoice_number}</span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="font-semibold text-[13px]">{inv.profile?.full_name || '—'}</p>
                        <p className="text-[11px] text-ink-4">{inv.profile?.email}</p>
                      </div>
                    </td>
                    <td>
                      <span className="text-[11px] font-semibold text-ink-2 bg-surface-1 px-2 py-1 rounded-pill">
                        {inv.type === 'subscription' ? '📋 Abonnement' : '⚡ Top-up'}
                        {inv.billing_cycle === 'annual' ? ' (annuel)' : ''}
                      </span>
                    </td>
                    <td>
                      <div>
                        <p className="font-bold text-[14px] text-ink-1">{formatNumber(inv.total_ttc)} MAD</p>
                        <p className="text-[11px] text-ink-4">HT: {formatNumber(inv.amount_ht)} + TVA: {formatNumber(inv.tva_amount)}</p>
                      </div>
                    </td>
                    <td>
                      <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-pill border', st.color)}>
                        <StIcon className="w-3 h-3" />{st.label}
                      </span>
                      {inv.paid_at && <p className="text-[10px] text-ink-4 mt-0.5">{formatDate(inv.paid_at)}</p>}
                    </td>
                    <td className="text-[12px] text-ink-3">{formatDate(inv.created_at)}</td>
                    <td>
                      <div className="flex gap-1.5">
                        {inv.status === 'pending' && (
                          <button onClick={() => setShowPayModal(inv)}
                            className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-2.5 py-1.5 rounded-[7px] border border-emerald-200 transition-colors">
                            <CheckCircle className="w-3 h-3" /> Marquer payée
                          </button>
                        )}
                        {inv.status === 'pending' && (
                          <button onClick={() => doAction(inv.id, 'cancel')} disabled={acting === inv.id}
                            className="text-[11px] text-red-500 hover:text-red-700 px-1.5 py-1.5">
                            ✕
                          </button>
                        )}
                        {inv.notes && (
                          <span title={inv.notes} className="text-[11px] text-ink-4 px-1.5 py-1 cursor-help">📝</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

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

      {/* Mark paid modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] w-full max-w-sm shadow-card-lg animate-scale-in p-7 space-y-4">
            <h3 className="font-bold text-[16px] text-ink-1">Marquer comme payée</h3>
            <p className="text-[13px] text-ink-3">
              Facture <strong>{showPayModal.invoice_number}</strong> — {formatNumber(showPayModal.total_ttc)} MAD
            </p>
            <div>
              <label className="label text-[12px]">Référence de paiement</label>
              <input type="text" value={payRef} onChange={e => setPayRef(e.target.value)}
                className="input text-sm" placeholder="N° virement, chèque…" autoFocus />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowPayModal(null); setPayRef('') }} className="btn-ghost flex-1 text-sm">Annuler</button>
              <button onClick={async () => {
                await doAction(showPayModal.id, 'mark_paid', payRef)
                setShowPayModal(null); setPayRef('')
              }} disabled={acting === showPayModal.id}
                className="btn-brand flex-1 text-sm flex items-center justify-center gap-2">
                {acting === showPayModal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
