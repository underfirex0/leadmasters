'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Loader2, Crown } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { cn } from '@/lib/utils'

const ROLES = ['DRH','Directrice des RH','DAF','Directeur des Achats','Directrice des Achats',
  'DG / CEO','Directeur Commercial','DSI','Directeur Marketing']
const SECTORS = ['Industrie & Manufacturing','Services Financiers','Grande Distribution',
  "Technologies de l'information",'Santé & Pharma','BTP & Construction',
  'FMCG & Agroalimentaire','Immobilier & Construction','Transport & Logistique','Autre']
const SIZES = ['1-50 employés','50-200 employés','200-500 employés','500-1000 employés','1000+ employés']
const CITIES = ['Casablanca','Rabat','Tanger','Marrakech','Agadir','Fès','Meknès','Autre']
const MONTHLY = [2, 3, 4, 6, 8]

const EXPERTISE_BY_ROLE: Record<string, string[]> = {
  'DRH': ['Recrutement','Formation','GPEC','Droit Social','Culture RH','Restructuration','Paie','Mobilité interne'],
  'Directrice des RH': ['Recrutement','Formation','GPEC','Droit Social','Culture RH','Restructuration'],
  'DAF': ['Budget & Contrôle','Trésorerie','Fiscalité','Audit','Reporting','Levée de fonds','Contrôle de gestion'],
  'DG / CEO': ['Stratégie','Business Development','Fundraising','M&A','International','Croissance','Innovation'],
  'Directeur des Achats': ['Sourcing','Négociation','Supply Chain','Appels d\'offres','Import/Export','Lean'],
  'Directrice des Achats': ['Sourcing','Négociation','Supply Chain','Appels d\'offres','Import/Export'],
  'DSI': ['Transformation digitale','ERP','Cybersécurité','Cloud','Data & BI','IA','Gestion de projets IT'],
  'Directeur Commercial': ['B2B Sales','Grands comptes','Distribution','Marchés publics','Export','CRM'],
  'Directeur Marketing': ['Marketing digital','SEO/SEA','Branding','CRM','Growth','Événementiel'],
}

export default function ApplyMasterPage() {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
    full_name: '', role: '', company_sector: '', company_size: '',
    city: '', bio: '', linkedin_url: '', max_meetings_per_month: 4,
    expertise: [] as string[], topics: ['', '', ''],
  })

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const toggleExpertise = (tag: string) => {
    setForm(f => ({
      ...f,
      expertise: f.expertise.includes(tag)
        ? f.expertise.filter(e => e !== tag)
        : [...f.expertise, tag],
    }))
  }

  const availableExpertise = form.role ? (EXPERTISE_BY_ROLE[form.role] ?? []) : []

  async function handleSubmit() {
    if (!form.full_name || !form.role || !form.company_sector || !form.city) {
      toast.error('Remplissez tous les champs obligatoires'); return
    }
    if (!form.bio || form.bio.length < 50) {
      toast.error('Votre bio doit faire au moins 50 caractères'); return
    }
    if (form.expertise.length === 0) {
      toast.error('Sélectionnez au moins une expertise'); return
    }
    setLoading(true)
    try {
      const topics = form.topics.filter(Boolean)
      const res = await fetch('/api/meetmaster/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, topics }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Erreur'); return }
      setDone(true)
    } finally { setLoading(false) }
  }

  if (done) return (
    <div className="max-w-lg mx-auto py-20 text-center animate-scale-in">
      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Crown className="w-10 h-10 text-amber-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-3" style={{fontFamily:'Syne,sans-serif'}}>Candidature envoyée !</h2>
      <p className="text-slate-500 mb-6">
        Notre équipe va examiner votre profil et vous contacter sous 48h pour validation.
        Une fois approuvé, votre profil sera visible dans la directory MeetMaster.
      </p>
      <div className="card p-5 text-left space-y-2 text-sm mb-6">
        {['Examen de votre profil sous 48h','Activation de votre compte Master','Première demande de meeting reçue','Paiement par virement après chaque meeting'].map(s => (
          <p key={s} className="flex items-center gap-2 text-slate-600">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />{s}
          </p>
        ))}
      </div>
      <Link href="/meetmaster" className="btn-primary">Explorer la directory</Link>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Link href="/meetmaster" className="btn-secondary inline-flex items-center gap-2 text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour
      </Link>

      {/* Header */}
      <div className="relative card p-8 overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/30 rounded-full px-4 py-1.5 text-sm text-amber-300 font-semibold mb-4">
            <Crown className="w-4 h-4" /> Devenir Master
          </div>
          <h1 className="text-2xl font-bold text-white mb-2" style={{fontFamily:'Syne,sans-serif'}}>
            Ouvrez votre agenda.<br />Soyez rémunéré pour votre expertise.
          </h1>
          <p className="text-white/50 text-sm">500 MAD par meeting effectué · Jusqu'à 8 meetings/mois</p>
        </div>
      </div>

      {/* Form */}
      <div className="card p-6 space-y-6">
        <h2 className="font-bold text-slate-900" style={{fontFamily:'Syne,sans-serif'}}>Votre profil professionnel</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Nom complet <span className="text-red-400">*</span></label>
            <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)}
              className="input" placeholder="Mohammed Alaoui" />
            <p className="text-xs text-slate-400 mt-1">Affiché comme "Mohammed A." pour la confidentialité</p>
          </div>
          <div>
            <label className="label">Votre rôle <span className="text-red-400">*</span></label>
            <select value={form.role} onChange={e => { set('role', e.target.value); set('expertise', []) }} className="input">
              <option value="">Sélectionner…</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Ville <span className="text-red-400">*</span></label>
            <select value={form.city} onChange={e => set('city', e.target.value)} className="input">
              <option value="">Sélectionner…</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Secteur d'activité <span className="text-red-400">*</span></label>
            <select value={form.company_sector} onChange={e => set('company_sector', e.target.value)} className="input">
              <option value="">Sélectionner…</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Taille de l'entreprise</label>
            <select value={form.company_size} onChange={e => set('company_size', e.target.value)} className="input">
              <option value="">Sélectionner…</option>
              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Votre bio professionnelle <span className="text-red-400">*</span></label>
          <textarea value={form.bio} onChange={e => set('bio', e.target.value)}
            className="input resize-none" rows={4}
            placeholder="Décrivez votre parcours, vos responsabilités actuelles et ce qui vous rend unique. Min. 50 caractères." />
          <p className="text-xs text-slate-400 mt-1">{form.bio.length} / 50 min.</p>
        </div>

        <div>
          <label className="label">LinkedIn URL</label>
          <input type="url" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)}
            className="input" placeholder="https://www.linkedin.com/in/votre-profil" />
        </div>

        {/* Expertise */}
        {availableExpertise.length > 0 && (
          <div>
            <label className="label">Domaines d'expertise <span className="text-red-400">*</span></label>
            <div className="flex flex-wrap gap-2">
              {availableExpertise.map(tag => (
                <button key={tag} type="button" onClick={() => toggleExpertise(tag)}
                  className={cn(
                    'text-sm px-3 py-1.5 rounded-full border font-medium transition-all',
                    form.expertise.includes(tag)
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                  )}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Topics */}
        <div>
          <label className="label">Sujets de prédilection (ce que les entreprises apprendront)</label>
          <div className="space-y-2">
            {form.topics.map((t, i) => (
              <input key={i} type="text" value={t}
                onChange={e => { const ts = [...form.topics]; ts[i] = e.target.value; set('topics', ts) }}
                className="input text-sm" placeholder={`Sujet ${i + 1}${i === 0 ? ' (ex: Stratégies de recrutement au Maroc)' : ''}`} />
            ))}
          </div>
        </div>

        {/* Availability */}
        <div>
          <label className="label">Meetings par mois (max)</label>
          <div className="flex gap-2">
            {MONTHLY.map(n => (
              <button key={n} type="button" onClick={() => set('max_meetings_per_month', n)}
                className={cn(
                  'w-12 h-12 rounded-xl border text-sm font-bold transition-all',
                  form.max_meetings_per_month === n
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                )}>
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Revenu potentiel : <strong>{form.max_meetings_per_month * 500} MAD/mois</strong>
          </p>
        </div>

        <button onClick={handleSubmit} disabled={loading}
          className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-base">
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Envoi en cours…</> : '🎯 Soumettre ma candidature'}
        </button>
        <p className="text-xs text-slate-400 text-center">
          Votre candidature sera examinée sous 48h. Aucun engagement avant validation.
        </p>
      </div>
    </div>
  )
}
