'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, CheckCircle, Clock, XCircle, FileText } from 'lucide-react'
import { cn, formatDate, formatNumber } from '@/lib/utils'
import type { Invoice } from '@/types'

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/subscription').then(r => r.json()).then(d => {
      // We'll get invoices from a dedicated endpoint
    })
    fetch('/api/invoices').then(r => r.json()).then(d => {
      setInvoices(d.invoices ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const STATUS = {
    paid:      { label: 'Payée',   color: 'text-emerald-700 bg-emerald-50 border-emerald-100', icon: CheckCircle },
    pending:   { label: 'En attente', color: 'text-amber-700 bg-amber-50 border-amber-100',   icon: Clock },
    cancelled: { label: 'Annulée', color: 'text-red-600 bg-red-50 border-red-100',            icon: XCircle },
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-reveal-in">
      <div className="flex items-center gap-3">
        <Link href="/account" className="btn-ghost text-sm"><ArrowLeft className="w-4 h-4" /> Retour</Link>
      </div>

      <div>
        <h1 className="font-bold text-ink-1" style={{ fontSize: '26px', letterSpacing: '-0.8px' }}>Mes factures</h1>
        <p className="text-[14px] text-ink-3 mt-1">Téléchargez vos justificatifs comptables.</p>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-[14px] p-4 text-[13px] text-amber-800">
        <strong>Paiement par virement bancaire</strong> — Pour toute facture en attente, contactez-nous à{' '}
        <a href="mailto:facturation@leadscout.ma" className="underline">facturation@leadscout.ma</a>.
      </div>

      <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[20px] shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.05)]">
          <p className="font-bold text-[14px] text-ink-1">Historique des factures</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-ink-4">Chargement…</div>
        ) : invoices.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="w-10 h-10 text-ink-5 mx-auto mb-3" />
            <p className="text-[14px] text-ink-3">Aucune facture pour l&apos;instant.</p>
            <p className="text-[12px] text-ink-4 mt-1">Vos factures apparaîtront ici après votre premier achat.</p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(0,0,0,0.04)]">
            {invoices.map(inv => {
              const st = STATUS[inv.status] ?? STATUS.pending
              const Icon = st.icon
              return (
                <div key={inv.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-surface-1/60 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-surface-1 rounded-[10px] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-ink-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[13px] text-ink-1">{inv.invoice_number}</p>
                        <span className={cn('badge border text-[10px]', st.color)}>
                          <Icon className="w-3 h-3" />{st.label}
                        </span>
                        <span className="badge badge-gray text-[10px]">
                          {inv.type === 'subscription' ? 'Abonnement' : 'Top-up'}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-4 mt-0.5">{formatDate(inv.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-[14px] text-ink-1">{formatNumber(inv.total_ttc)} MAD</p>
                      <p className="text-[11px] text-ink-4">dont TVA {formatNumber(inv.tva_amount)} MAD</p>
                    </div>
                    <a href={`mailto:facturation@leadscout.ma?subject=Facture ${inv.invoice_number}`}
                      className="w-8 h-8 bg-surface-1 hover:bg-brand-50 border border-[rgba(0,0,0,0.08)] hover:border-brand-200 rounded-[8px] flex items-center justify-center transition-all">
                      <Download className="w-3.5 h-3.5 text-ink-3 hover:text-brand-600" />
                    </a>
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
