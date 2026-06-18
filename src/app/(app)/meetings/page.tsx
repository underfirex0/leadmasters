'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Calendar, Clock, CheckCircle, XCircle, Loader2,
  Phone, Star, Crown, AlertCircle, ExternalLink, MessageSquare
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import type { MeetingRequest, MeetingStatus } from '@/types'

const STATUS_CONFIG: Record<MeetingStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  pending:          { label: 'En attente',      color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',  icon: Clock },
  accepted:         { label: 'Confirmé',         color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
  completed:        { label: 'Terminé',           color: 'text-slate-600',   bg: 'bg-slate-100',  border: 'border-slate-200',  icon: CheckCircle },
  rejected:         { label: 'Refusé',            color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',    icon: XCircle },
  cancelled_buyer:  { label: 'Annulé',            color: 'text-slate-500',   bg: 'bg-slate-100',  border: 'border-slate-200',  icon: XCircle },
  cancelled_master: { label: 'Annulé par Master', color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200', icon: XCircle },
}

export default function MeetingsPage() {
  const toast = useToast()
  const [meetings, setMeetings] = useState<MeetingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [feedbackMeeting, setFeedbackMeeting] = useState<string | null>(null)
  const [feedback, setFeedback] = useState({ text: '', rating: 0 })
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  async function fetchMeetings() {
    const res = await fetch('/api/meetmaster/meetings?role=buyer')
    const data = await res.json()
    setMeetings(data.meetings ?? [])
    setLoading(false)
  }
  useEffect(() => { fetchMeetings() }, [])

  async function submitFeedback(meetingId: string) {
    if (!feedback.rating) { toast.error('Donnez une note'); return }
    setSubmittingFeedback(true)
    try {
      const res = await fetch(`/api/meetmaster/meetings/${meetingId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'feedback', buyer_feedback: feedback.text, buyer_rating: feedback.rating }),
      })
      if (!res.ok) { toast.error('Erreur'); return }
      toast.success('Feedback envoyé. Merci !')
      setFeedbackMeeting(null)
      setFeedback({ text: '', rating: 0 })
      fetchMeetings()
    } finally { setSubmittingFeedback(false) }
  }

  async function cancelMeeting(meetingId: string) {
    if (!confirm('Annuler cette demande de meeting ?')) return
    await fetch(`/api/meetmaster/meetings/${meetingId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    })
    toast.success('Meeting annulé')
    fetchMeetings()
  }

  const active    = meetings.filter(m => ['pending','accepted'].includes(m.status))
  const completed = meetings.filter(m => m.status === 'completed')
  const past      = meetings.filter(m => ['rejected','cancelled_buyer','cancelled_master'].includes(m.status))

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{fontFamily:'Syne,sans-serif'}}>Mes Meetings</h1>
          <p className="text-slate-500 mt-1">{meetings.length} demande{meetings.length > 1 ? 's' : ''} au total</p>
        </div>
        <Link href="/meetmaster" className="btn-primary flex items-center gap-2 text-sm">
          <Crown className="w-4 h-4" /> Réserver un meeting
        </Link>
      </div>

      {meetings.length === 0 ? (
        <div className="card p-16 text-center">
          <Crown className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-2">Vous n'avez pas encore de meetings.</p>
          <Link href="/meetmaster" className="btn-primary mt-4 inline-block">Parcourir les Masters</Link>
        </div>
      ) : (
        <>
          {/* Active */}
          {active.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wide text-slate-500">En cours</h2>
              {active.map(m => <MeetingCard key={m.id} meeting={m} onCancel={cancelMeeting} onFeedback={setFeedbackMeeting} />)}
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-sm uppercase tracking-wide text-slate-500">Terminés</h2>
              {completed.map(m => (
                <div key={m.id}>
                  <MeetingCard meeting={m} onCancel={cancelMeeting} onFeedback={setFeedbackMeeting} />
                  {!m.buyer_rating && feedbackMeeting !== m.id && (
                    <button onClick={() => setFeedbackMeeting(m.id)}
                      className="ml-4 mt-2 text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1">
                      <Star className="w-3 h-3" /> Laisser un feedback
                    </button>
                  )}
                  {feedbackMeeting === m.id && (
                    <div className="card p-5 mt-2 space-y-4 animate-slide-down">
                      <h3 className="font-bold text-sm text-slate-900">Votre avis sur ce meeting</h3>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(n => (
                          <button key={n} onClick={() => setFeedback(f => ({ ...f, rating: n }))}
                            className={cn('w-10 h-10 rounded-xl border text-lg transition-all',
                              feedback.rating >= n ? 'bg-amber-400 border-amber-400 text-white' : 'border-slate-200 text-slate-400')}>
                            ★
                          </button>
                        ))}
                      </div>
                      <textarea value={feedback.text} onChange={e => setFeedback(f => ({ ...f, text: e.target.value }))}
                        className="input resize-none text-sm" rows={3}
                        placeholder="Ce meeting vous a-t-il été utile ? Qu'avez-vous appris ?" />
                      <div className="flex gap-3">
                        <button onClick={() => setFeedbackMeeting(null)} className="btn-secondary flex-1 text-sm">Annuler</button>
                        <button onClick={() => submitFeedback(m.id)} disabled={submittingFeedback}
                          className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                          {submittingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          Envoyer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-sm uppercase tracking-wide text-slate-500">Archivés</h2>
              {past.map(m => <MeetingCard key={m.id} meeting={m} onCancel={cancelMeeting} onFeedback={setFeedbackMeeting} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MeetingCard({ meeting: m, onCancel, onFeedback }: {
  meeting: MeetingRequest
  onCancel: (id: string) => void
  onFeedback: (id: string) => void
}) {
  const cfg = STATUS_CONFIG[m.status]
  const Icon = cfg.icon
  const master = m.master as Record<string, string> | undefined

  return (
    <div className="card p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {master?.display_name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2) ?? 'MM'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-slate-900">{master?.display_name ?? 'Master'}</p>
              <span className="text-slate-400">·</span>
              <p className="text-sm text-indigo-600">{master?.role}</p>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Sujet : <span className="text-slate-700 font-medium">{m.topic}</span></p>
            {m.confirmed_date && (
              <p className="text-sm text-emerald-700 font-medium mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(m.confirmed_date)}
              </p>
            )}
            {m.meeting_link && (
              <a href={m.meeting_link} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 font-medium flex items-center gap-1 mt-1 hover:underline">
                <ExternalLink className="w-3 h-3" /> Rejoindre le meeting
              </a>
            )}
            {m.rejection_reason && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {m.rejection_reason}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1">{formatDate(m.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('badge border', cfg.bg, cfg.color, cfg.border)}>
            <Icon className="w-3 h-3" />{cfg.label}
          </span>
          {m.status === 'pending' && (
            <button onClick={() => onCancel(m.id)}
              className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
              Annuler
            </button>
          )}
          {m.status === 'completed' && !m.buyer_rating && (
            <button onClick={() => onFeedback(m.id)}
              className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1">
              <Star className="w-3 h-3" /> Feedback
            </button>
          )}
          {m.buyer_rating && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: m.buyer_rating }).map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
