'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Phone, PhoneOff, PhoneMissed, PhoneCall,
  CheckCircle, XCircle, Clock, Star, Archive,
  ChevronDown, ChevronUp, Search, StickyNote,
  Loader2, Trash2, RefreshCw, UserRound, Mail,
  Globe, MapPin, Users, TrendingUp, Building2,
  CalendarClock, AlertTriangle, RotateCcw, Lock,
  Flag, Calendar, Bell, AlertCircle, Zap, Activity
} from 'lucide-react'
import { cn, formatDate, formatDateShort } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import { FIELD_COSTS } from '@/lib/constants'
import type { CRMLead, CRMStatus, CRMPriority, CallOutcome } from '@/types'

// ── Helpers ───────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'hier'
  if (d < 7) return `il y a ${d}j`
  return formatDateShort(dateStr)
}

function callbackStatus(dateStr: string): 'overdue' | 'today' | 'upcoming' {
  const d = new Date(dateStr)
  const today = new Date(); today.setHours(0,0,0,0)
  const cb = new Date(d); cb.setHours(0,0,0,0)
  if (cb < today) return 'overdue'
  if (cb.getTime() === today.getTime()) return 'today'
  return 'upcoming'
}

const CALLBACK_COLORS = {
  overdue:  'text-red-700 bg-red-50 border-red-200',
  today:    'text-orange-700 bg-orange-50 border-orange-200',
  upcoming: 'text-blue-700 bg-blue-50 border-blue-100',
}

const PRIORITY_CONFIG = {
  low:     { label: 'Basse',   color: 'text-slate-400', bg: 'bg-slate-100', icon: Flag },
  normal:  { label: 'Normale', color: 'text-slate-400', bg: '',             icon: Flag },
  high:    { label: 'Haute',   color: 'text-orange-500', bg: 'bg-orange-50', icon: Flag },
  urgent:  { label: 'Urgente', color: 'text-red-500',    bg: 'bg-red-50',    icon: AlertCircle },
}

// ── Status config ─────────────────────────────────────────────
const STATUS_CONFIG: Record<CRMStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  to_call:       { label: 'À appeler',     color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200',   icon: Phone },
  in_progress:   { label: 'En cours',      color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200', icon: PhoneCall },
  callback:      { label: 'À rappeler',    color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200', icon: CalendarClock },
  interested:    { label: 'Intéressé',     color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200',  icon: CheckCircle },
  not_interested:{ label: 'Pas intéressé', color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200',    icon: XCircle },
  converted:     { label: 'Converti',      color: 'text-emerald-700',bg: 'bg-emerald-50', border: 'border-emerald-200',icon: Star },
  archived:      { label: 'Archivé',       color: 'text-slate-500',  bg: 'bg-slate-100',  border: 'border-slate-200',  icon: Archive },
}
const ALL_STATUSES = Object.keys(STATUS_CONFIG) as CRMStatus[]

const CALL_OUTCOMES: { value: CallOutcome; label: string; icon: React.ElementType; color: string; nextStatus: CRMStatus }[] = [
  { value: 'no_answer',      label: 'Pas de réponse', icon: PhoneOff,     color: 'text-slate-600 bg-slate-100 hover:bg-slate-200',   nextStatus: 'to_call' },
  { value: 'voicemail',      label: 'Messagerie',     icon: PhoneMissed,  color: 'text-purple-600 bg-purple-50 hover:bg-purple-100', nextStatus: 'to_call' },
  { value: 'callback',       label: 'À rappeler',     icon: CalendarClock,color: 'text-orange-600 bg-orange-50 hover:bg-orange-100', nextStatus: 'callback' },
  { value: 'interested',     label: 'Intéressé',      icon: CheckCircle,  color: 'text-green-600 bg-green-50 hover:bg-green-100',    nextStatus: 'interested' },
  { value: 'not_interested', label: 'Pas intéressé',  icon: XCircle,      color: 'text-red-600 bg-red-50 hover:bg-red-100',          nextStatus: 'not_interested' },
]

function StatusBadge({ status, onClick }: { status: CRMStatus; onClick?: (e?: React.MouseEvent) => void }) {
  const cfg = STATUS_CONFIG[status]; const Icon = cfg.icon
  return (
    <button onClick={onClick ? (e) => onClick(e) : undefined}
      className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap',
        cfg.bg, cfg.color, cfg.border, onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default')}>
      <Icon className="w-3 h-3" />{cfg.label}
    </button>
  )
}

type CallModalState = { leadId: string; bizName: string; phone: string | null } | null
type CallbackModalState = { leadId: string; bizName: string } | null

export default function CRMPage() {
  const toast = useToast()
  const [leads, setLeads]   = useState<CRMLead[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<CRMStatus | 'all' | 'callbacks_due'>('all')
  const [search, setSearch]   = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [callModal, setCallModal]   = useState<CallModalState>(null)
  const [callNote, setCallNote]     = useState('')
  const [savingCall, setSavingCall] = useState(false)
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({})
  const [savingNote, setSavingNote]     = useState<string | null>(null)
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null)
  const [dropdownPos, setDropdownPos]       = useState<{top:number;left:number}>({top:0,left:0})
  const [callbackModal, setCallbackModal]   = useState<CallbackModalState>(null)
  const [callbackDate, setCallbackDate]     = useState('')
  const [callbackNote, setCallbackNote]     = useState('')
  const [pendingStatus, setPendingStatus]   = useState<string | null>(null)
  const [unlocking, setUnlocking]           = useState<Record<string, string>>({})

  // Close dropdown on Escape
  useEffect(() => {
    if (!statusDropdown) return
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setStatusDropdown(null) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [statusDropdown])

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const isCallbacksTab = activeTab === 'callbacks_due'
      const url = isCallbacksTab
        ? '/api/crm/leads?status=callback'
        : activeTab === 'all' ? '/api/crm/leads' : `/api/crm/leads?status=${activeTab}`
      const res  = await fetch(url)
      const data = await res.json()
      let ls = data.leads ?? []

      if (isCallbacksTab) {
        // Only leads with overdue/today callbacks
        const today = new Date(); today.setHours(23,59,59,999)
        ls = ls.filter((l: CRMLead) => l.callback_date && new Date(l.callback_date) <= today)
      }

      setLeads(ls)
      setCounts(data.counts ?? {})
    } finally { setLoading(false) }
  }, [activeTab])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  // Count overdue/today callbacks
  const dueTodayCount = leads.filter(l => {
    if (activeTab !== 'callbacks_due' && l.status !== 'callback') return false
    if (!l.callback_date) return false
    return callbackStatus(l.callback_date) !== 'upcoming'
  }).length

  const allCallbacksDue = Object.values(counts).reduce((s, v) => s, 0) // placeholder

  const totalLeads    = Object.values(counts).reduce((s, v) => s + v, 0)
  const filteredLeads = leads.filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    const biz = l.business as Record<string, unknown> | null
    return (biz?.name as string || '').toLowerCase().includes(q) ||
      (biz?.city as string || '').toLowerCase().includes(q) ||
      (biz?.sector as string || '').toLowerCase().includes(q)
  })

  async function updateStatus(leadId: string, newStatus: CRMStatus) {
    setStatusDropdown(null)
    if (newStatus === 'callback') {
      setPendingStatus(leadId + ':' + newStatus)
      setCallbackModal({ leadId, bizName: leads.find(l => l.id === leadId)?.business ? (leads.find(l => l.id === leadId)?.business as Record<string,unknown>)?.name as string : 'Lead' })
      return
    }
    const res = await fetch(`/api/crm/leads/${leadId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setLeads(prev => prev.map(l => l.id === leadId
        ? { ...l, status: newStatus, status_changed_at: new Date().toISOString() } : l
      ))
      toast.success(`Statut → ${STATUS_CONFIG[newStatus].label}`)
    } else toast.error('Erreur')
  }

  async function confirmCallback() {
    if (!callbackModal || !callbackDate) return
    const leadId = callbackModal.leadId
    const newStatus = (pendingStatus?.split(':')[1] ?? 'callback') as CRMStatus
    const res = await fetch(`/api/crm/leads/${leadId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, callback_date: new Date(callbackDate).toISOString(), callback_note: callbackNote }),
    })
    if (res.ok) {
      setLeads(prev => prev.map(l => l.id === leadId
        ? { ...l, status: newStatus, callback_date: new Date(callbackDate).toISOString(), callback_note: callbackNote, status_changed_at: new Date().toISOString() }
        : l
      ))
      toast.success('Rappel planifié')
    } else toast.error('Erreur')
    setCallbackModal(null); setCallbackDate(''); setCallbackNote(''); setPendingStatus(null)
  }

  async function updatePriority(leadId: string, priority: string) {
    const res = await fetch(`/api/crm/leads/${leadId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority }),
    })
    if (res.ok) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, priority: priority as CRMPriority } : l))
    }
  }

  async function saveNote(leadId: string) {
    setSavingNote(leadId)
    const note = editingNotes[leadId] ?? ''
    const res = await fetch(`/api/crm/leads/${leadId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: note }),
    })
    if (res.ok) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, notes: note } : l))
      toast.success('Note sauvegardée')
    }
    setSavingNote(null)
  }

  async function logCall(outcome: CallOutcome, nextStatus: CRMStatus) {
    if (!callModal) return
    setSavingCall(true)
    const res = await fetch(`/api/crm/leads/${callModal.leadId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus, call_outcome: outcome, call_notes: callNote }),
    })
    if (res.ok) {
      setLeads(prev => prev.map(l => l.id === callModal.leadId
        ? { ...l, status: nextStatus, status_changed_at: new Date().toISOString() } : l
      ))
      toast.success('Appel enregistré')
    }
    setSavingCall(false); setCallModal(null); setCallNote('')
  }

  async function deleteLead(leadId: string) {
    if (!confirm('Supprimer ce lead ?')) return
    await fetch(`/api/crm/leads/${leadId}`, { method: 'DELETE' })
    setLeads(prev => prev.filter(l => l.id !== leadId))
    toast.success('Lead supprimé')
  }

  async function unlockField(bizId: string, field: string) {
    const key = `${bizId}:${field}`
    setUnlocking(u => ({ ...u, [key]: 'loading' }))
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: bizId, field }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || 'Erreur'); setUnlocking(u => { const n={...u}; delete n[key]; return n }); return }
      setUnlocking(u => ({ ...u, [key]: d.value ?? '' }))
      setLeads(prev => prev.map(lead => {
        if (!lead.business || (lead.business as Record<string,unknown>).id !== bizId) return lead
        const biz = lead.business as Record<string, unknown>
        return { ...lead, business: { ...biz, [field]: d.value, unlocked: { ...(biz.unlocked as Record<string,unknown> ?? {}), [field]: d.value } } as typeof lead.business }
      }))
      if (!d.alreadyUnlocked) toast.success(`Débloqué · −${d.creditsSpent} cr`)
    } catch { toast.error('Erreur réseau'); setUnlocking(u => { const n={...u}; delete n[key]; return n }) }
  }

  // Count due callbacks across all leads
  const [dueBadge, setDueBadge] = useState(0)
  useEffect(() => {
    if (activeTab === 'all' && leads.length > 0) {
      const today = new Date(); today.setHours(23,59,59,999)
      const n = leads.filter(l => l.status === 'callback' && l.callback_date && new Date(l.callback_date) <= today).length
      setDueBadge(n)
    }
  }, [leads, activeTab])

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Dropdown backdrop */}
      {statusDropdown && (
        <div className="fixed inset-0" style={{ zIndex: 9998, pointerEvents: 'auto' }}
          onClick={() => setStatusDropdown(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM — Suivi des leads</h1>
          <p className="text-slate-500 mt-1">{totalLeads} lead{totalLeads > 1 ? 's' : ''} au total</p>
        </div>
        <button onClick={fetchLeads} className="btn-secondary flex items-center gap-2 text-sm self-start">
          <RefreshCw className="w-3.5 h-3.5" /> Actualiser
        </button>
      </div>

      {/* Due callbacks banner */}
      {dueBadge > 0 && activeTab === 'all' && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-[14px] p-4">
          <Bell className="w-5 h-5 text-orange-600 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-orange-900 text-[14px]">
              {dueBadge} rappel{dueBadge > 1 ? 's' : ''} à traiter aujourd&apos;hui
            </p>
            <p className="text-orange-700 text-[12px]">Des leads attendent votre appel.</p>
          </div>
          <button onClick={() => setActiveTab('callbacks_due')}
            className="text-[12px] font-semibold text-orange-700 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition-colors">
            Voir →
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'À appeler',  count: counts.to_call ?? 0,    icon: Phone,        color: 'text-blue-600 bg-blue-50' },
          { label: 'À rappeler', count: counts.callback ?? 0,   icon: CalendarClock,color: 'text-orange-600 bg-orange-50' },
          { label: 'Intéressé',  count: counts.interested ?? 0, icon: CheckCircle,  color: 'text-green-600 bg-green-50' },
          { label: 'Converti',   count: counts.converted ?? 0,  icon: Star,         color: 'text-emerald-600 bg-emerald-50' },
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[14px] p-4 shadow-xs">
            <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center mb-2 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="font-bold text-slate-900 text-xl tabular-nums">{count}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {[
          { id: 'all',           label: `Tous (${totalLeads})` },
          { id: 'callbacks_due', label: `🔔 Rappels du jour${dueBadge > 0 ? ` (${dueBadge})` : ''}` },
          { id: 'to_call',       label: `À appeler (${counts.to_call ?? 0})` },
          { id: 'callback',      label: `À rappeler (${counts.callback ?? 0})` },
          { id: 'interested',    label: `Intéressé (${counts.interested ?? 0})` },
          { id: 'converted',     label: `Converti (${counts.converted ?? 0})` },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id as typeof activeTab)}
            className={cn('px-4 py-2 rounded-pill text-xs font-semibold whitespace-nowrap transition-all',
              activeTab === id ? 'bg-brand-600 text-white' : 'bg-surface-2 text-slate-600 hover:text-slate-900')}>
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un lead par nom, ville, secteur…"
          className="input pl-10 bg-white text-sm" />
      </div>

      {/* Table */}
      <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
        ) : filteredLeads.length === 0 ? (
          <div className="py-16 text-center">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Aucun lead{search ? ' trouvé' : ' dans cette catégorie'}.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">Entreprise</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">Contact</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">Statut</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide hidden md:table-cell">Activité</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map(lead => {
                const biz = lead.business as Record<string, unknown> | null
                const isExpanded    = expandedId === lead.id
                const isEditingNote = lead.id in editingNotes
                const priority      = (lead as Record<string,unknown>).priority as string ?? 'normal'
                const priorityCfg   = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.normal
                const callbackDate  = (lead as Record<string,unknown>).callback_date as string | null
                const statusChangedAt = (lead as Record<string,unknown>).status_changed_at as string | null
                const cbStatus = callbackDate ? callbackStatus(callbackDate) : null

                return [
                  <tr key={lead.id}
                    className={cn('border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer',
                      cbStatus === 'overdue' ? 'border-l-2 border-l-red-400' :
                      cbStatus === 'today'   ? 'border-l-2 border-l-orange-400' : ''
                    )}
                    onClick={() => setExpandedId(isExpanded ? null : lead.id)}>

                    {/* Company */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {/* Priority flag */}
                        <div className="relative group shrink-0">
                          <Flag className={cn('w-3.5 h-3.5 cursor-pointer transition-colors', priorityCfg.color)}
                            onClick={e => {
                              e.stopPropagation()
                              const order = ['normal','high','urgent','low','normal']
                              const nextPriority = order[order.indexOf(priority) + 1] ?? 'normal'
                              updatePriority(lead.id, nextPriority)
                            }} />
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-1 hidden group-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                            Priorité: {priorityCfg.label} (clic pour changer)
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-[13px]">{biz?.name as string ?? '—'}</p>
                          <p className="text-[11px] text-slate-400">{biz?.sector as string} · {biz?.city as string}</p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 ml-auto shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-auto shrink-0" />}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      {(() => {
                        const phone = biz?.phone as string | null
                        const email = biz?.email as string | null
                        return <>
                          {phone
                            ? <p className="text-[12px] text-slate-700 font-mono">{phone}</p>
                            : <p className="text-[11px] text-slate-300 italic">Téléphone non débloqué</p>
                          }
                          {email && <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{email}</p>}
                        </>
                      })()}
                    </td>

                    {/* Status + timestamp */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="space-y-1">
                        <StatusBadge status={lead.status}
                          onClick={(e) => {
                            if (statusDropdown === lead.id) { setStatusDropdown(null); return }
                            const btn = e?.currentTarget as HTMLElement
                            if (btn) {
                              const rect = btn.getBoundingClientRect()
                              const DROPDOWN_H = 7 * 36 + 16
                              const top = window.innerHeight - rect.bottom < DROPDOWN_H
                                ? rect.top - DROPDOWN_H - 4 : rect.bottom + 4
                              setDropdownPos({ top, left: rect.left })
                            }
                            setStatusDropdown(lead.id)
                          }} />
                        {/* Timestamp */}
                        {statusChangedAt && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />{timeAgo(statusChangedAt)}
                          </p>
                        )}
                        {/* Callback date badge */}
                        {callbackDate && cbStatus && (
                          <div className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border', CALLBACK_COLORS[cbStatus])}>
                            <Calendar className="w-2.5 h-2.5" />
                            {cbStatus === 'overdue' ? '⚠ ' : ''}
                            {new Date(callbackDate).toLocaleDateString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                          </div>
                        )}

                        {/* Status dropdown */}
                        {statusDropdown === lead.id && (
                          <div style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
                            className="bg-white shadow-xl border border-slate-200 rounded-xl py-1 w-48 animate-scale-in"
                            onClick={e => e.stopPropagation()}>
                            {ALL_STATUSES.map(s => {
                              const cfg = STATUS_CONFIG[s]; const Icon = cfg.icon
                              return (
                                <button key={s} onClick={() => updateStatus(lead.id, s)}
                                  className={cn('w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors',
                                    lead.status === s ? cn(cfg.bg, cfg.color) : 'text-slate-700 hover:bg-slate-50')}>
                                  <Icon className="w-3.5 h-3.5" />{cfg.label}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Activity */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-xs text-slate-500">
                        {(lead.call_logs as unknown[])?.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {(lead.call_logs as unknown[]).length} appel{(lead.call_logs as unknown[]).length > 1 ? 's' : ''}
                          </span>
                        )}
                        {lead.notes && (
                          <span className="inline-flex items-center gap-1 ml-2">
                            <StickyNote className="w-3 h-3" /> Note
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCallModal({ leadId: lead.id, bizName: biz?.name as string ?? 'Lead', phone: biz?.phone as string ?? null })}
                          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                          <Phone className="w-3.5 h-3.5" /> Appeler
                        </button>
                        <button onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button onClick={() => deleteLead(lead.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>,

                  /* Expanded panel */
                  isExpanded && (
                    <tr key={`${lead.id}-exp`} className="bg-slate-50/50 border-b border-slate-100">
                      <td colSpan={5} className="px-5 py-5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

                          {/* Contact */}
                          <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Contact</h4>
                            <div className="space-y-2.5">
                              {([
                                { icon: Phone, label: 'Téléphone', field: 'phone',   val: biz?.phone },
                                { icon: Mail,  label: 'E-mail',    field: 'email',   val: biz?.email },
                                { icon: Globe, label: 'Site web',  field: 'website', val: biz?.website },
                                { icon: MapPin,label: 'Adresse',   field: 'address', val: biz?.address },
                              ] as {icon:React.ElementType;label:string;field:string;val:unknown}[]).map(({ icon: Icon, label, field, val }) => (
                                <div key={label} className="flex items-start gap-2">
                                  <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
                                    {val ? <p className="text-[13px] text-slate-800 break-all">{val as string}</p>
                                      : <button onClick={() => unlockField(biz?.id as string, field)} disabled={unlocking[`${biz?.id}:${field}`]==='loading'}
                                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-[6px] hover:bg-amber-100 transition-colors disabled:opacity-50">
                                          {unlocking[`${biz?.id}:${field}`]==='loading' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Lock className="w-2.5 h-2.5" />}
                                          Débloquer · {FIELD_COSTS[field]??1} cr
                                        </button>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Dirigeant + Directions */}
                          <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><UserRound className="w-3.5 h-3.5" /> Dirigeant</h4>
                            <div className="space-y-2.5">
                              {([
                                { icon: UserRound, label: 'Nom',           field: 'dirigeant_name',  val: biz?.dirigeant_name },
                                { icon: Phone,     label: 'Tél. direct',   field: 'dirigeant_phone', val: biz?.dirigeant_phone },
                                { icon: Mail,      label: 'E-mail direct', field: 'dirigeant_email', val: biz?.dirigeant_email },
                              ] as {icon:React.ElementType;label:string;field:string;val:unknown}[]).map(({ icon: Icon, label, field, val }) => (
                                <div key={label} className="flex items-start gap-2">
                                  <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
                                    {val ? <p className="text-[13px] text-slate-800 break-all">{val as string}</p>
                                      : <button onClick={() => unlockField(biz?.id as string, field)} disabled={unlocking[`${biz?.id}:${field}`]==='loading'}
                                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-[6px] hover:bg-amber-100 transition-colors disabled:opacity-50">
                                          {unlocking[`${biz?.id}:${field}`]==='loading' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Lock className="w-2.5 h-2.5" />}
                                          Débloquer · {FIELD_COSTS[field]??2} cr
                                        </button>}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Direction contacts */}
                            {([{prefix:'dir_daf',emoji:'💰',label:'DAF'},{prefix:'dir_rh',emoji:'👥',label:'DRH'},{prefix:'dir_achat',emoji:'🛒',label:'Dir. Achats'},{prefix:'dir_marketing',emoji:'📣',label:'Marketing'},{prefix:'dir_commercial',emoji:'📈',label:'Commercial'}] as {prefix:string;emoji:string;label:string}[]).map(({prefix,emoji,label}) => {
                              const nom = biz?.[`${prefix}_nom`] as string|null; const email = biz?.[`${prefix}_email`] as string|null
                              if (!nom && !email) return null
                              return (
                                <div key={prefix} className="mt-2.5 p-2.5 bg-white border border-[rgba(0,0,0,0.07)] rounded-[10px]">
                                  <p className="text-[10px] font-bold text-slate-500 mb-1">{emoji} {label}</p>
                                  {nom ? <p className="text-[12px] font-semibold text-slate-800">{nom}</p>
                                    : <button onClick={() => unlockField(biz?.id as string, `${prefix}_nom`)}
                                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-[5px] hover:bg-amber-100">
                                        <Lock className="w-2 h-2" /> Nom · 2 cr
                                      </button>}
                                  {email ? <p className="text-[11px] text-brand-600 mt-0.5 break-all">{email}</p>
                                    : <button onClick={() => unlockField(biz?.id as string, `${prefix}_email`)}
                                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-[5px] hover:bg-amber-100 mt-0.5">
                                        <Lock className="w-2 h-2" /> E-mail · 5 cr
                                      </button>}
                                </div>
                              )
                            })}
                          </div>

                          {/* Entreprise + Notes */}
                          <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Entreprise</h4>
                            <div className="space-y-2.5 mb-4">
                              {([
                                { icon: Users,      label: 'Effectif',         field: 'effectif_label', val: biz?.effectif_label },
                                { icon: TrendingUp, label: "CA",               field: 'revenue_label',  val: biz?.revenue_label },
                              ] as {icon:React.ElementType;label:string;field:string;val:unknown}[]).map(({ icon: Icon, label, field, val }) => (
                                <div key={label} className="flex items-start gap-2">
                                  <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
                                    {val ? <p className="text-[13px] text-slate-800">{val as string}</p>
                                      : <button onClick={() => unlockField(biz?.id as string, field)} disabled={unlocking[`${biz?.id}:${field}`]==='loading'}
                                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-[6px] hover:bg-amber-100 transition-colors disabled:opacity-50">
                                          {unlocking[`${biz?.id}:${field}`]==='loading' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Lock className="w-2.5 h-2.5" />}
                                          Débloquer · {FIELD_COSTS[field]??2} cr
                                        </button>}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Callback note if set */}
                            {lead.callback_note && (
                              <div className="mb-3 text-[12px] bg-orange-50 border border-orange-100 rounded-[8px] p-2.5">
                                <p className="font-semibold text-orange-800 mb-0.5 flex items-center gap-1"><Bell className="w-3 h-3" /> Note rappel</p>
                                <p className="text-orange-700">{lead.callback_note}</p>
                              </div>
                            )}

                            {/* Notes */}
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><StickyNote className="w-3.5 h-3.5" /> Notes</p>
                              <textarea
                                value={isEditingNote ? editingNotes[lead.id] : (lead.notes ?? '')}
                                onChange={e => setEditingNotes(prev => ({ ...prev, [lead.id]: e.target.value }))}
                                placeholder="Ajouter une note…" rows={3}
                                className="input text-xs resize-none" />
                              {isEditingNote && (
                                <button onClick={() => saveNote(lead.id)} disabled={savingNote === lead.id}
                                  className="mt-1.5 text-xs btn-brand py-1 px-3 flex items-center gap-1">
                                  {savingNote === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Sauvegarder
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                ].filter(Boolean)
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Call modal ── */}
      {callModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] w-full max-w-sm shadow-card-lg p-6 space-y-4 animate-scale-in">
            <div>
              <h3 className="font-bold text-[16px] text-slate-900">Enregistrer l&apos;appel</h3>
              <p className="text-[13px] text-slate-500 mt-0.5">{callModal.bizName}</p>
              {callModal.phone && (
                <a href={`tel:${callModal.phone}`} className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-[10px] px-4 py-3 mt-3 text-brand-700 font-mono text-[14px] hover:bg-brand-100 transition-colors">
                  <Phone className="w-4 h-4" /> {callModal.phone}
                </a>
              )}
            </div>
            <div>
              <label className="label text-[12px]">Résultat de l&apos;appel</label>
              <div className="space-y-2">
                {CALL_OUTCOMES.map(({ value, label, icon: Icon, color, nextStatus }) => (
                  <button key={value} disabled={savingCall}
                    onClick={() => logCall(value, nextStatus)}
                    className={cn('w-full flex items-center gap-2 px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition-all', color, savingCall && 'opacity-50')}>
                    {savingCall ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label text-[12px]">Note <span className="text-slate-400 font-normal">(optionnel)</span></label>
              <textarea value={callNote} onChange={e => setCallNote(e.target.value)} className="input text-sm resize-none" rows={2} placeholder="Message, informations…" />
            </div>
            <button onClick={() => { setCallModal(null); setCallNote('') }} className="btn-ghost w-full text-sm">Fermer</button>
          </div>
        </div>
      )}

      {/* ── Callback date picker modal ── */}
      {callbackModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] w-full max-w-sm shadow-card-lg p-6 space-y-4 animate-scale-in">
            <div>
              <h3 className="font-bold text-[16px] text-slate-900">Planifier un rappel</h3>
              <p className="text-[13px] text-slate-500">{callbackModal.bizName}</p>
            </div>
            <div>
              <label className="label text-[12px]">Date et heure du rappel <span className="text-red-400">*</span></label>
              <input type="datetime-local" value={callbackDate} onChange={e => setCallbackDate(e.target.value)}
                min={new Date().toISOString().slice(0,16)} className="input text-sm" required />
            </div>
            <div>
              <label className="label text-[12px]">Note de rappel <span className="text-slate-400 font-normal">(optionnel)</span></label>
              <input type="text" value={callbackNote} onChange={e => setCallbackNote(e.target.value)}
                className="input text-sm" placeholder="ex: Demander M. Ibrahim" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setCallbackModal(null); setCallbackDate(''); setCallbackNote(''); setPendingStatus(null) }}
                className="btn-ghost flex-1 text-sm">Annuler</button>
              <button onClick={confirmCallback} disabled={!callbackDate}
                className="btn-brand flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-40">
                <Calendar className="w-4 h-4" /> Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
