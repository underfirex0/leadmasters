'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, CheckCircle2, XCircle, Loader2, RefreshCw, Clock, FileText, ChevronDown, ChevronUp, User, MessageSquare, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Request {
  id: string
  file_name: string
  file_size_bytes: number | null
  estimated_rows: number | null
  user_notes: string | null
  admin_notes: string | null
  status: string
  created_at: string
  processed_at: string | null
  profiles: { id: string; email: string; full_name: string | null; plan_id: string | null }
}

const STATUS = {
  pending:    { label: 'En attente',  color: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-400'   },
  processing: { label: 'En cours',    color: 'bg-brand-50 text-brand-700 border-brand-200',    dot: 'bg-brand-500'   },
  completed:  { label: 'Terminé',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  rejected:   { label: 'Refusé',      color: 'bg-red-50 text-red-700 border-red-200',          dot: 'bg-red-500'     },
}

const PLAN_LABELS: Record<string, string> = { decouverte: '🌱', solo: '⚡ Solo', equipe: '👥 Équipe', business: '🚀 Business', entreprise: '🏢' }

export default function AdminDataRequestsPage() {
  const [requests, setRequests]       = useState<Request[]>([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState<string>('all')
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [adminNotesDraft, setAdminNotesDraft] = useState<Record<string, string>>({})
  const [saving, setSaving]           = useState<Record<string, boolean>>({})
  const [downloading, setDownloading] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const url = filter === 'all' ? '/api/admin/data-requests' : `/api/admin/data-requests?status=${filter}`
    const res = await fetch(url)
    if (res.ok) { const d = await res.json(); setRequests(d.requests ?? []) }
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  async function updateStatus(id: string, status: string, notes?: string) {
    setSaving(p => ({ ...p, [id]: true }))
    await fetch(`/api/admin/data-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, admin_notes: notes ?? adminNotesDraft[id] ?? undefined }),
    })
    setSaving(p => ({ ...p, [id]: false }))
    await load()
  }

  async function saveNotes(id: string) {
    setSaving(p => ({ ...p, [`notes_${id}`]: true }))
    await fetch(`/api/admin/data-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_notes: adminNotesDraft[id] ?? '' }),
    })
    setSaving(p => ({ ...p, [`notes_${id}`]: false }))
    await load()
  }

  async function downloadFile(id: string, fileName: string) {
    setDownloading(p => ({ ...p, [id]: true }))
    const res = await fetch(`/api/admin/data-requests/${id}`)
    if (res.ok) {
      const { url } = await res.json()
      const a = document.createElement('a')
      a.href = url; a.download = fileName; a.click()
    }
    setDownloading(p => ({ ...p, [id]: false }))
  }

  const counts = requests.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {} as Record<string, number>)
  const pendingCount = counts['pending'] ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-ink-1 mb-1" style={{ letterSpacing: '-0.6px' }}>
            Imports CSV
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white text-[11px] font-bold rounded-full">{pendingCount}</span>
            )}
          </h1>
          <p className="text-[13px] text-ink-3">Téléchargez les fichiers, mappez les colonnes, injectez dans le CRM du client.</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 text-[13px] font-medium text-ink-3 hover:text-ink-1 transition-colors py-2 px-3 rounded-lg hover:bg-surface-2">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Actualiser
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(STATUS).map(([key, cfg]) => (
          <div key={key} className="bg-white rounded-xl border border-[rgba(0,0,0,0.07)] px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn('w-2 h-2 rounded-full', cfg.dot)} />
              <span className="text-[11px] font-semibold text-ink-4 uppercase tracking-wide">{cfg.label}</span>
            </div>
            <p className="text-[24px] font-extrabold text-ink-1" style={{ letterSpacing: '-1px' }}>{counts[key] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-surface-2 rounded-xl p-1 w-fit">
        {[['all', 'Toutes'], ['pending', 'En attente'], ['processing', 'En cours'], ['completed', 'Terminées'], ['rejected', 'Refusées']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={cn('px-4 py-1.5 text-[12px] font-semibold rounded-lg transition-all',
              filter === v ? 'bg-white text-ink-1 shadow-xs' : 'text-ink-3 hover:text-ink-1')}>
            {l}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16"><Loader2 className="w-5 h-5 animate-spin text-ink-4 mx-auto" /></div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] p-10 text-center">
          <FileText className="w-8 h-8 text-ink-5 mx-auto mb-3" />
          <p className="text-[14px] text-ink-4">Aucune demande {filter !== 'all' ? `"${filter}"` : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(req => {
            const cfg = STATUS[req.status as keyof typeof STATUS] ?? STATUS.pending
            const isExpanded = expandedId === req.id
            const plan = PLAN_LABELS[req.profiles?.plan_id ?? ''] ?? '—'
            const initNotes = adminNotesDraft[req.id] ?? req.admin_notes ?? ''

            return (
              <div key={req.id} className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] overflow-hidden">
                {/* Row header */}
                <button onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-surface-1 transition-colors">
                  <div className="w-9 h-9 bg-surface-2 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-ink-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-ink-1 truncate">{req.file_name}</p>
                      {req.estimated_rows && <span className="text-[10px] text-ink-4 shrink-0">{req.estimated_rows.toLocaleString('fr-MA')} lignes</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-ink-4 flex items-center gap-1">
                        <User className="w-3 h-3" />{req.profiles?.full_name || req.profiles?.email}
                      </span>
                      <span className="text-[10px] text-ink-4">{plan}</span>
                      <span className="text-[11px] text-ink-4">{format(new Date(req.created_at), 'd MMM yyyy HH:mm', { locale: fr })}</span>
                    </div>
                  </div>
                  <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill border text-[11px] font-semibold shrink-0', cfg.color)}>
                    <div className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                    {cfg.label}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-ink-4 shrink-0" /> : <ChevronDown className="w-4 h-4 text-ink-4 shrink-0" />}
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-[rgba(0,0,0,0.05)] pt-4 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* User info */}
                      <div className="bg-surface-1 rounded-xl p-4 space-y-2">
                        <p className="text-[10px] font-bold text-ink-4 uppercase tracking-wide">Client</p>
                        <p className="text-[13px] font-semibold text-ink-1">{req.profiles?.full_name || '—'}</p>
                        <p className="text-[12px] text-ink-3">{req.profiles?.email}</p>
                        <p className="text-[11px] text-ink-4">Plan: {plan}</p>
                        {req.file_size_bytes && (
                          <p className="text-[11px] text-ink-4">Taille: {(req.file_size_bytes / 1024).toFixed(0)} Ko</p>
                        )}
                      </div>

                      {/* User notes */}
                      {req.user_notes ? (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> Notes du client
                          </p>
                          <p className="text-[12.5px] text-amber-900 whitespace-pre-wrap leading-relaxed">{req.user_notes}</p>
                        </div>
                      ) : (
                        <div className="bg-surface-1 rounded-xl p-4 flex items-center justify-center">
                          <p className="text-[12px] text-ink-4 italic">Pas de notes du client</p>
                        </div>
                      )}
                    </div>

                    {/* Admin notes */}
                    <div>
                      <label className="text-[11px] font-bold text-ink-4 uppercase tracking-wide block mb-2">Notes admin (visible par le client)</label>
                      <textarea
                        value={initNotes}
                        onChange={e => setAdminNotesDraft(p => ({ ...p, [req.id]: e.target.value }))}
                        rows={3}
                        placeholder="Ex: Votre import est en cours de traitement. Nous avons mappé les colonnes A→raison_sociale, B→téléphone…"
                        className="w-full border border-[rgba(0,0,0,0.1)] rounded-xl px-4 py-3 text-[13px] text-ink-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 placeholder:text-ink-5"
                      />
                      <button onClick={() => saveNotes(req.id)} disabled={saving[`notes_${req.id}`]}
                        className="mt-1.5 text-[12px] font-semibold text-brand-600 hover:text-brand-800 transition-colors flex items-center gap-1">
                        {saving[`notes_${req.id}`] ? <><Loader2 className="w-3 h-3 animate-spin" /> Sauvegarde…</> : '↳ Sauvegarder les notes'}
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[rgba(0,0,0,0.05)]">
                      {/* Download */}
                      <button onClick={() => downloadFile(req.id, req.file_name)} disabled={downloading[req.id]}
                        className="flex items-center gap-2 px-4 py-2 bg-ink-1 text-white text-[13px] font-semibold rounded-lg hover:bg-ink-2 transition-colors disabled:opacity-60">
                        {downloading[req.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Télécharger le fichier
                      </button>

                      {/* Status changes */}
                      {req.status === 'pending' && (
                        <button onClick={() => updateStatus(req.id, 'processing')} disabled={saving[req.id]}
                          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-[13px] font-semibold rounded-lg hover:bg-brand-700 transition-colors">
                          {saving[req.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                          Marquer &quot;En cours&quot;
                        </button>
                      )}
                      {(req.status === 'pending' || req.status === 'processing') && (
                        <>
                          <button onClick={() => updateStatus(req.id, 'completed')} disabled={saving[req.id]}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-[13px] font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
                            {saving[req.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Marquer &quot;Terminé&quot;
                          </button>
                          <button onClick={() => updateStatus(req.id, 'rejected')} disabled={saving[req.id]}
                            className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 text-[13px] font-semibold rounded-lg hover:bg-red-50 transition-colors">
                            <XCircle className="w-4 h-4" /> Refuser
                          </button>
                        </>
                      )}
                      {(req.status === 'completed' || req.status === 'rejected') && (
                        <button onClick={() => updateStatus(req.id, 'pending')} disabled={saving[req.id]}
                          className="flex items-center gap-2 px-4 py-2 border border-[rgba(0,0,0,0.1)] text-ink-3 text-[13px] font-medium rounded-lg hover:bg-surface-2 transition-colors">
                          <AlertCircle className="w-4 h-4" /> Remettre en attente
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
