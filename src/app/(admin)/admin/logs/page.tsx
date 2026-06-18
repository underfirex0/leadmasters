'use client'
import { useState, useEffect, useCallback } from 'react'
import { Activity, Filter, Loader2, Phone, StickyNote, Lock, UserPlus, Calendar, Flag } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

type Log = {
  id: string
  user_id: string
  lead_id: string | null
  business_name: string | null
  action_type: string
  from_value: string | null
  to_value: string | null
  details: Record<string, unknown>
  created_at: string
  profile: { email: string; full_name: string | null } | null
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  status_change:    { label: 'Changement statut', icon: Activity,  color: 'text-brand-600 bg-brand-50' },
  call_logged:      { label: 'Appel enregistré',  icon: Phone,     color: 'text-green-600 bg-green-50' },
  note_added:       { label: 'Note ajoutée',       icon: StickyNote,color: 'text-violet-600 bg-violet-50' },
  field_unlocked:   { label: 'Champ débloqué',     icon: Lock,      color: 'text-amber-600 bg-amber-50' },
  lead_added:       { label: 'Lead ajouté',         icon: UserPlus,  color: 'text-emerald-600 bg-emerald-50' },
  callback_set:     { label: 'Rappel planifié',     icon: Calendar,  color: 'text-orange-600 bg-orange-50' },
  priority_changed: { label: 'Priorité modifiée',   icon: Flag,      color: 'text-red-600 bg-red-50' },
}

export default function AdminLogsPage() {
  const [logs, setLogs]       = useState<Log[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString() })
      if (typeFilter) params.set('type', typeFilter)
      const res = await fetch(`/api/admin/logs?${params}`)
      const d   = await res.json()
      setLogs(d.logs ?? [])
      setTotal(d.total ?? 0)
    } finally { setLoading(false) }
  }, [page, typeFilter])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-ink-1" style={{ fontSize: '26px', letterSpacing: '-0.8px' }}>Logs d&apos;activité</h1>
        <p className="text-[14px] text-ink-3 mt-1">Toutes les actions effectuées sur la plateforme.</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-surface-2 p-1 rounded-[10px]">
          <button onClick={() => { setTypeFilter(''); setPage(1) }}
            className={cn('px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all',
              !typeFilter ? 'bg-white text-ink-1 shadow-xs' : 'text-ink-3 hover:text-ink-1')}>
            Tous
          </button>
          {Object.entries(ACTION_CONFIG).map(([key, { label }]) => (
            <button key={key} onClick={() => { setTypeFilter(key); setPage(1) }}
              className={cn('px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all whitespace-nowrap',
                typeFilter === key ? 'bg-white text-ink-1 shadow-xs' : 'text-ink-3 hover:text-ink-1')}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-ink-4">{total} entrée{total > 1 ? 's' : ''}</p>
      </div>

      {/* Log list */}
      <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <Activity className="w-8 h-8 text-ink-5 mx-auto mb-3" />
            <p className="text-[14px] text-ink-3">Aucune activité enregistrée.</p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(0,0,0,0.04)]">
            {logs.map(log => {
              const cfg = ACTION_CONFIG[log.action_type] ?? { label: log.action_type, icon: Activity, color: 'text-ink-3 bg-surface-2' }
              const Icon = cfg.icon
              return (
                <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-surface-1/60 transition-colors">
                  {/* Icon */}
                  <div className={cn('w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 mt-0.5', cfg.color)}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-semibold text-[13px] text-ink-1">{cfg.label}</span>
                      {log.business_name && (
                        <span className="text-[12px] text-ink-3">— {log.business_name}</span>
                      )}
                    </div>

                    {/* Status change arrow */}
                    {log.action_type === 'status_change' && log.from_value && log.to_value && (
                      <p className="text-[12px] text-ink-3">
                        <span className="font-medium text-ink-2">{log.from_value}</span>
                        {' → '}
                        <span className="font-bold text-brand-700">{log.to_value}</span>
                      </p>
                    )}

                    {/* Callback info */}
                    {log.action_type === 'callback_set' && log.to_value && (
                      <p className="text-[12px] text-ink-3">
                        Planifié pour : <span className="font-medium text-ink-2">{log.to_value}</span>
                        {typeof log.details?.note === 'string' && (
                          <span className="italic ml-1">— {log.details.note}</span>
                        )}
                      </p>
                    )}

                    {/* Note preview */}
                    {log.action_type === 'note_added' && typeof log.details?.note === 'string' && (
                      <p className="text-[12px] text-ink-3 italic truncate max-w-md">
                        &ldquo;{log.details.note}&rdquo;
                      </p>
                    )}

                    {/* Call outcome */}
                    {log.action_type === 'call_logged' && log.to_value && (
                      <p className="text-[12px] text-ink-3">
                        Résultat : <span className="font-medium text-ink-2">{log.to_value}</span>
                      </p>
                    )}

                    {/* Priority */}
                    {log.action_type === 'priority_changed' && (
                      <p className="text-[12px] text-ink-3">
                        {log.from_value} → <span className="font-bold text-ink-2">{log.to_value}</span>
                      </p>
                    )}

                    {/* User + time */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-4 h-4 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-brand-700 font-bold text-[8px]">
                          {(log.profile?.full_name || log.profile?.email || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[11px] text-ink-4">
                        {log.profile?.full_name || log.profile?.email}
                      </span>
                      <span className="text-[11px] text-ink-5">·</span>
                      <span className="text-[11px] text-ink-4">{formatDate(log.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {total > 50 && (
          <div className="px-6 py-4 border-t border-[rgba(0,0,0,0.05)] flex items-center justify-between">
            <p className="text-[12px] text-ink-3">Page {page} / {Math.ceil(total / 50)}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-ghost btn-sm disabled:opacity-40">←</button>
              <button disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)} className="btn-ghost btn-sm disabled:opacity-40">→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
