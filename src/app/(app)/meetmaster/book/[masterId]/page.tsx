'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Loader2, Calendar, MessageSquare, Building2, User } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { cn } from '@/lib/utils'
import type { Master } from '@/types'

const TOPICS = [
  'Benchmark salarial & pratiques RH',
  'Stratégie de recrutement',
  'Optimisation des coûts & trésorerie',
  'Structuration financière PME',
  'Négociation avec fournisseurs',
  'Transformation digitale',
  'Développement business & croissance',
  'Supply chain & logistique',
  'Autre sujet',
]

export default function BookingPage() {
  const { masterId } = useParams() as { masterId: string }
  const router = useRouter()
  const toast = useToast()

  const [master, setMaster] = useState<Master | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [step, setStep] = useState(1)

  const [form, setForm] = useState({
    topic: '',
    context: '',
    buyer_company: '',
    buyer_role: '',
    preferred_date_1: '',
    preferred_date_2: '',
    preferred_date_3: '',
  })

  useEffect(() => {
    fetch(`/api/meetmaster/masters/${masterId}`)
      .then(r => r.json())
      .then(d => setMaster(d.master))
      .finally(() => setLoading(false))
  }, [masterId])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.topic) { toast.error('Choisissez un sujet'); return }
    if (!form.buyer_company || !form.buyer_role) { toast.error('Renseignez votre entreprise et rôle'); return }
    if (!form.preferred_date_1) { toast.error('Proposez au moins une date'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/meetmaster/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ master_id: masterId, ...form }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Erreur'); return }
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
    </div>
  )

  if (!master) return (
    <div className="text-center py-20">
      <p className="text-slate-500">Master introuvable.</p>
      <Link href="/meetmaster" className="btn-primary mt-4 inline-block">Retour</Link>
    </div>
  )

  if (done) return (
    <div className="max-w-lg mx-auto py-16 text-center animate-scale-in">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-emerald-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-3" style={{fontFamily:'Syne,sans-serif'}}>
        Demande envoyée !
      </h2>
      <p className="text-slate-500 mb-2">
        <strong>{master.display_name}</strong> va examiner votre demande et vous confirmer un créneau sous 24h.
      </p>
      <div className="card p-5 mt-6 text-left space-y-2 text-sm">
        <p className="flex items-center gap-2 text-slate-600">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          Réponse sous 24 heures
        </p>
        <p className="flex items-center gap-2 text-slate-600">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          Facture de 1 000 MAD après confirmation
        </p>
        <p className="flex items-center gap-2 text-slate-600">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          Lien Google Meet envoyé avec la confirmation
        </p>
      </div>
      <div className="flex gap-3 justify-center mt-8">
        <Link href="/meetings" className="btn-primary">Voir mes meetings</Link>
        <Link href="/meetmaster" className="btn-secondary">Parcourir d'autres Masters</Link>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Link href={`/meetmaster/${masterId}`} className="btn-secondary inline-flex items-center gap-2 text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour au profil
      </Link>

      {/* Master summary */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
          {master.display_name.split(' ').map(w => w[0]).join('').slice(0, 2)}
        </div>
        <div className="flex-1">
          <p className="font-bold text-slate-900">{master.display_name}</p>
          <p className="text-sm text-indigo-600">{master.role}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-900">1 000 MAD</p>
          <p className="text-xs text-slate-400">30 minutes</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {[1, 2].map(s => (
          <div key={s} className={cn(
            'flex items-center gap-2 text-sm font-semibold transition-colors',
            step >= s ? 'text-slate-900' : 'text-slate-400'
          )}>
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
              step > s ? 'bg-emerald-500 text-white' :
              step === s ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
            )}>
              {step > s ? <CheckCircle className="w-4 h-4" /> : s}
            </div>
            {s === 1 ? 'Votre demande' : 'Vos disponibilités'}
          </div>
        ))}
      </div>

      {/* Step 1: Meeting details */}
      {step === 1 && (
        <div className="card p-6 space-y-5 animate-slide-up">
          <h2 className="font-bold text-lg text-slate-900" style={{fontFamily:'Syne,sans-serif'}}>
            Votre demande de meeting
          </h2>

          <div>
            <label className="label flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-400" /> Sujet du meeting
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TOPICS.map(t => (
                <button key={t} type="button"
                  onClick={() => set('topic', t)}
                  className={cn(
                    'text-left text-sm px-4 py-2.5 rounded-xl border transition-all',
                    form.topic === t
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  )}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Contexte & objectif <span className="text-slate-400 font-normal">(optionnel)</span></label>
            <textarea
              value={form.context}
              onChange={e => set('context', e.target.value)}
              className="input resize-none" rows={3}
              placeholder={`Précisez votre situation, ce que vous cherchez à apprendre ou décider grâce à ce meeting…`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" /> Votre entreprise
              </label>
              <input type="text" value={form.buyer_company} onChange={e => set('buyer_company', e.target.value)}
                className="input" placeholder="Nom de votre entreprise" />
            </div>
            <div>
              <label className="label flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" /> Votre rôle
              </label>
              <input type="text" value={form.buyer_role} onChange={e => set('buyer_role', e.target.value)}
                className="input" placeholder="ex. Directeur Général" />
            </div>
          </div>

          <button
            onClick={() => {
              if (!form.topic) { toast.error('Choisissez un sujet'); return }
              if (!form.buyer_company || !form.buyer_role) { toast.error('Renseignez votre entreprise et rôle'); return }
              setStep(2)
            }}
            className="btn-primary w-full py-3">
            Continuer →
          </button>
        </div>
      )}

      {/* Step 2: Availability */}
      {step === 2 && (
        <div className="card p-6 space-y-5 animate-slide-up">
          <h2 className="font-bold text-lg text-slate-900" style={{fontFamily:'Syne,sans-serif'}}>
            Vos disponibilités
          </h2>
          <p className="text-sm text-slate-500">
            Proposez jusqu'à 3 créneaux. {master.display_name} choisira le plus adapté.
          </p>

          {[
            { key: 'preferred_date_1', label: '1er choix (requis)' },
            { key: 'preferred_date_2', label: '2ème choix' },
            { key: 'preferred_date_3', label: '3ème choix' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="label flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" /> {label}
              </label>
              <input
                type="datetime-local"
                value={form[key as keyof typeof form]}
                onChange={e => set(key, e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="input"
              />
            </div>
          ))}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">💳 Facturation</p>
            <p>Une facture de <strong>1 000 MAD</strong> vous sera envoyée par email après confirmation du meeting.
              Paiement par virement bancaire ou chèque.</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1">← Retour</button>
            <button onClick={handleSubmit} disabled={submitting}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi…</> : 'Envoyer la demande →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
