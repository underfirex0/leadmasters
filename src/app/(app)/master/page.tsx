'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Crown, Star, TrendingUp, CheckCircle, XCircle, Clock,
  Calendar, Loader2, ExternalLink, AlertCircle, Users, DollarSign
} from 'lucide-react'
import { cn, formatDate, formatNumber } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import type { Master, MeetingRequest } from '@/types'

export default function MasterDashboard() {
  const toast = useToast()
  const [master, setMaster]   = useState<Master | null>(null)
  const [meetings, setMeetings] = useState<MeetingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'requests' | 'upcoming' | 'earnings'>('requests')

  // Accept modal state
  const [accepting, setAccepting]         = useState<string | null>(null)
  const [acceptLink, setAcceptLink]       = useState('')
  const [acceptDate, setAcceptDate]       = useState('')
  const [rejecting, setRejecting]         = useState<string | null>(null)
  const [rejectReason, setRejectReason]   = useState('')
  const [submitting, setSubmitting]       = useState(false)

  async function load() {
    const [masterRes, meetRes] = await Promise.all([
      fetch('/api/meetmaster/masters?own=true'),
      fetch('/api/meetmaster/meetings?role=master'),
    ])
    const masterData = await masterRes.json()
    const meetData   = await meetRes.json()
    setMaster(masterData.masters?.[0] ?? null)
    setMeetings(meetData.meetings ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleAction(meetingId: string, action: string, extra?: Record<string, string>) {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/meetmaster/meetings/${meetingId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Erreur'); return }
      toast.success(action === 'accept' ? 'Meeting confirmé !' : 'Demande refusée')
      setAccepting(null); setRejecting(null)
      setAcceptLink(''); setAcceptDate(''); setRejectReason('')
      load()
    } finally { setSubmitting(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
    </div>
  )

  if (!master) return (
    <div className="max-w-lg mx-auto py-20 text-center">
      <Crown className="w-12 h-12 text-amber-300 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-slate-900 mb-3" style={{fontFamily:'Syne,sans-serif'}}>
        Vous n'êtes pas encore Master
      </h2>
      <p className="text-slate-500 mb-6">Soumettez votre candidature pour rejoindre la directory MeetMaster et être rémunéré pour vos meetings.</p>
      <Link href="/meetmaster/apply" className="btn-primary inline-flex items-center gap-2">
        <Crown className="w-4 h-4" /> Devenir Master
      </Link>
    </div>
  )

  if (master.application_status === 'pending') return (
    <div className="max-w-lg mx-auto py-20 text-center">
      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Clock className="w-8 h-8 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-3" style={{fontFamily:'Syne,sans-serif'}}>Candidature en cours d'examen</h2>
      <p className="text-slate-500">Notre équipe examine votre profil. Réponse sous 48h.</p>
    </div>
  )

  const pending   = meetings.filter(m => m.status === 'pending')
  const upcoming  = meetings.filter(m => m.status === 'accepted')
  const completed = meetings.filter(m => m.status === 'completed')
  const earnings  = completed.length * (master.payout_per_meeting ?? 500)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative card p-6 overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xl">
              {master.display_name.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-white text-lg" style={{fontFamily:'Syne,sans-serif'}}>{master.display_name}</p>
                {master.is_verified && <CheckCircle className="w-5 h-5 text-amber-400" />}
              </div>
              <p className="text-white/60 text-sm">{master.role} · {master.city}</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{master.meetings_completed}</p>
              <p className="text-white/40 text-xs">meetings</p>
            </div>
            {master.average_rating && (
              <div className="text-center">
                <p className="text-2xl font-bold text-white flex items-center gap-1">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />{master.average_rating}
                </p>
                <p className="text-white/40 text-xs">note moyenne</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">{formatNumber(earnings)}</p>
              <p className="text-white/40 text-xs">MAD gagnés</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Clock,      label: 'Demandes en attente', value: pending.length,   color: 'text-amber-600 bg-amber-50' },
          { icon: Calendar,   label: 'À venir confirmés',   value: upcoming.length,  color: 'text-emerald-600 bg-emerald-50' },
          { icon: TrendingUp, label: 'Ce mois (MAD)',       value: `${formatNumber(completed.length * 500)} MAD`, color: 'text-indigo-600 bg-indigo-50' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-slate-900 font-mono" style={{fontFamily:'Syne,sans-serif'}}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 card p-1">
        {[
          { key: 'requests', label: `Demandes${pending.length > 0 ? ` (${pending.length})` : ''}` },
          { key: 'upcoming', label: `À venir${upcoming.length > 0 ? ` (${upcoming.length})` : ''}` },
          { key: 'earnings', label: 'Revenus' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={cn(
              'flex-1 py-2 text-sm font-semibold rounded-xl transition-colors',
              tab === t.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Pending requests */}
      {tab === 'requests' && (
        <div className="space-y-4">
          {pending.length === 0 ? (
            <div className="card p-12 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              Aucune demande en attente.
            </div>
          ) : pending.map(m => {
            const buyer = m.buyer_profile as Record<string, string> | undefined
            return (
              <div key={m.id} className="card p-5 space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-bold text-slate-900">{buyer?.full_name ?? 'Utilisateur'}</p>
                    <p className="text-sm text-slate-500">{m.buyer_role} · {m.buyer_company}</p>
                  </div>
                  <span className="badge-amber text-xs">En attente · 500 MAD</span>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2">
                  <p><span className="font-semibold text-slate-700">Sujet :</span> {m.topic}</p>
                  {m.context && <p><span className="font-semibold text-slate-700">Contexte :</span> {m.context}</p>}
                </div>

                {/* Preferred dates */}
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-slate-700 mb-2">Créneaux proposés :</p>
                  {[m.preferred_date_1, m.preferred_date_2, m.preferred_date_3].filter(Boolean).map((d, i) => (
                    <p key={i} className="text-slate-600 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Option {i + 1} : {formatDate(d!)}
                    </p>
                  ))}
                </div>

                {/* Accept form */}
                {accepting === m.id ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-emerald-800">Confirmer le meeting</p>
                    <div>
                      <label className="label text-xs">Date et heure confirmées</label>
                      <input type="datetime-local" value={acceptDate} onChange={e => setAcceptDate(e.target.value)} className="input text-sm" />
                    </div>
                    <div>
                      <label className="label text-xs">Lien Google Meet / Zoom</label>
                      <input type="url" value={acceptLink} onChange={e => setAcceptLink(e.target.value)}
                        className="input text-sm" placeholder="https://meet.google.com/..." />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setAccepting(null)} className="btn-secondary flex-1 text-sm">Annuler</button>
                      <button disabled={submitting || !acceptDate}
                        onClick={() => handleAction(m.id, 'accept', { meeting_link: acceptLink, confirmed_date: acceptDate })}
                        className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Confirmer
                      </button>
                    </div>
                  </div>
                ) : rejecting === m.id ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-red-800">Motif du refus</p>
                    <select value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="input text-sm">
                      <option value="">Sélectionner…</option>
                      {["Sujet hors de mon expertise","Agenda surchargé ce mois","Demande trop vague","Autre"].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => setRejecting(null)} className="btn-secondary flex-1 text-sm">Annuler</button>
                      <button disabled={submitting || !rejectReason}
                        onClick={() => handleAction(m.id, 'reject', { rejection_reason: rejectReason })}
                        className="btn-danger flex-1 text-sm flex items-center justify-center gap-2">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Refuser
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => { setRejecting(m.id); setAccepting(null) }}
                      className="btn-secondary flex-1 text-sm border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2">
                      <XCircle className="w-4 h-4" /> Refuser
                    </button>
                    <button onClick={() => { setAccepting(m.id); setRejecting(null) }}
                      className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Accepter
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Tab: Upcoming */}
      {tab === 'upcoming' && (
        <div className="space-y-3">
          {upcoming.length === 0 ? (
            <div className="card p-12 text-center text-slate-400">
              <Calendar className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              Aucun meeting à venir.
            </div>
          ) : upcoming.map(m => {
            const buyer = m.buyer_profile as Record<string, string> | undefined
            return (
              <div key={m.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900">{buyer?.full_name ?? 'Acheteur'}</p>
                    <p className="text-sm text-slate-500">{m.buyer_role} · {m.buyer_company}</p>
                    <p className="text-sm font-medium text-slate-700 mt-1">Sujet : {m.topic}</p>
                    {m.confirmed_date && (
                      <p className="text-sm text-emerald-700 font-semibold mt-2 flex items-center gap-1">
                        <Calendar className="w-4 h-4" /> {formatDate(m.confirmed_date)}
                      </p>
                    )}
                    {m.meeting_link && (
                      <a href={m.meeting_link} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 font-medium flex items-center gap-1 mt-1 hover:underline">
                        <ExternalLink className="w-3 h-3" /> {m.meeting_link}
                      </a>
                    )}
                  </div>
                  <button onClick={() => handleAction(m.id, 'complete')}
                    className="btn-secondary text-xs flex items-center gap-1 whitespace-nowrap">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Marquer terminé
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tab: Earnings */}
      {tab === 'earnings' && (
        <div className="card p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold text-emerald-700 font-mono">{formatNumber(earnings)} MAD</p>
              <p className="text-sm text-emerald-600 mt-1">Total gagné</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold text-amber-700 font-mono">{master.meetings_completed}</p>
              <p className="text-sm text-amber-600 mt-1">Meetings complétés</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2 text-slate-600">
            <p className="font-semibold text-slate-900 mb-2">Paiements</p>
            <p>Les paiements sont effectués par virement bancaire chaque fin de mois.</p>
            <p>500 MAD par meeting effectué et noté par l'acheteur.</p>
            <p className="text-xs text-slate-400 mt-2">Contact : paiements@leadscout.ma</p>
          </div>

          {completed.length > 0 && (
            <div>
              <p className="font-semibold text-slate-900 mb-3 text-sm">Historique</p>
              <div className="space-y-2">
                {completed.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                    <div className="text-sm">
                      <p className="font-medium text-slate-900">{m.topic}</p>
                      <p className="text-slate-400 text-xs">{formatDate(m.confirmed_date ?? m.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">+500 MAD</p>
                      {m.buyer_rating && (
                        <div className="flex gap-0.5 justify-end">
                          {Array.from({ length: m.buyer_rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
