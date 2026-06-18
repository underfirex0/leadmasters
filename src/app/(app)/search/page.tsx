'use client'
import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, ChevronRight, ChevronDown, X, Check, Zap,
  Lock, AlertCircle, ArrowRight, Sparkles, Building2,
  Filter, Info, Crown, Users
} from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import { SECTORS, CITIES, REGIONS, FIELD_COSTS, FIELD_LABELS, EFFECTIF_OPTIONS } from '@/lib/constants'

// ── Types ─────────────────────────────────────────────────────
type FieldKey = keyof typeof FIELD_COSTS

// ── Field config ──────────────────────────────────────────────
const FIELD_GROUPS = [
  {
    id: 'contact',
    label: 'Contact entreprise',
    desc: 'Pour un premier contact direct',
    fields: ['phone', 'email', 'website', 'address'] as FieldKey[],
    color: 'text-brand-600 bg-brand-50',
  },
  {
    id: 'enriched',
    label: 'Données enrichies',
    desc: 'Pour mieux qualifier le prospect',
    fields: ['effectif_label', 'dirigeant_name', 'annee_creation'] as FieldKey[],
    color: 'text-violet-600 bg-violet-50',
  },
  {
    id: 'premium',
    label: 'Contact dirigeant',
    desc: 'Accès direct au décideur',
    fields: ['dirigeant_phone', 'dirigeant_email'] as FieldKey[],
    color: 'text-amber-600 bg-amber-50',
    warning: true,
    warningText: 'Non disponible pour toutes les entreprises. Coût déduit uniquement si le champ existe.',
  },
  {
    id: 'financial',
    label: 'Données financières',
    desc: 'Pour évaluer le potentiel client',
    fields: ['revenue_label', 'capital_social'] as FieldKey[],
    color: 'text-emerald-600 bg-emerald-50',
  },
]

// Preset bundles
const PRESETS = [
  { id: 'light',     label: 'Contact léger',   emoji: '⚡', fields: ['phone','email'],                              costPerBiz: 2,  desc: '~50 entreprises pour 100 cr' },
  { id: 'standard',  label: 'Profil standard', emoji: '📋', fields: ['phone','email','effectif_label','dirigeant_name'], costPerBiz: 6, desc: '~17 entreprises pour 100 cr' },
  { id: 'qualified', label: 'Profil qualifié', emoji: '🎯', fields: ['phone','email','dirigeant_name','dirigeant_phone'], costPerBiz: 9, desc: '~11 entreprises pour 100 cr' },
  { id: 'complete',  label: 'Profil complet',  emoji: '🔑', fields: ['phone','email','address','effectif_label','dirigeant_name','dirigeant_phone','dirigeant_email','revenue_label'], costPerBiz: 17, desc: '~6 entreprises pour 100 cr' },
]

// ── Multi-select dropdown ──────────────────────────────────────
function MultiSelect({ label, options, selected, onChange, placeholder }: {
  label: string; options: string[]; selected: string[]
  onChange: (v: string[]) => void; placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])

  return (
    <div className="relative">
      <label className="label text-[12px]">{label}</label>
      <button type="button" onClick={() => setOpen(!open)}
        className={cn('w-full flex items-center justify-between px-3.5 py-2.5 bg-white border rounded-[10px] text-sm transition-all text-left',
          open ? 'border-brand-400 ring-2 ring-brand-500/20' : 'border-[rgba(0,0,0,0.12)] hover:border-[rgba(0,0,0,0.2)]'
        )}>
        <span className={selected.length === 0 ? 'text-ink-5' : 'text-ink-1 font-medium'}>
          {selected.length === 0 ? placeholder :
           selected.length === 1 ? selected[0] :
           `${selected.length} sélectionnés`}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {selected.length > 0 && (
            <span className="w-5 h-5 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {selected.length}
            </span>
          )}
          <ChevronDown className={cn('w-4 h-4 text-ink-4 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[rgba(0,0,0,0.1)] rounded-[12px] shadow-floating z-20 overflow-hidden">
            {selected.length > 0 && (
              <div className="px-3 py-2 border-b border-[rgba(0,0,0,0.05)] flex items-center justify-between">
                <span className="text-[11px] text-ink-4">{selected.length} sélectionné(s)</span>
                <button onClick={() => onChange([])} className="text-[11px] text-red-500 font-medium hover:underline">
                  Tout effacer
                </button>
              </div>
            )}
            <div className="max-h-56 overflow-y-auto py-1">
              {options.map(opt => (
                <button key={opt} type="button" onClick={() => toggle(opt)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] hover:bg-surface-1 text-left transition-colors">
                  <div className={cn('w-4 h-4 rounded-[4px] border-2 flex items-center justify-center shrink-0 transition-all',
                    selected.includes(opt) ? 'bg-brand-600 border-brand-600' : 'border-[rgba(0,0,0,0.2)]'
                  )}>
                    {selected.includes(opt) && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </div>
                  <span className={selected.includes(opt) ? 'font-semibold text-ink-1' : 'text-ink-2'}>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Field toggle ──────────────────────────────────────────────
function FieldToggle({ field, selected, onToggle, disabled }: {
  field: FieldKey; selected: boolean; onToggle: () => void; disabled?: boolean
}) {
  const cost = FIELD_COSTS[field]
  const label = FIELD_LABELS[field]
  const tierColor = cost === 1 ? 'text-brand-600' : cost === 2 ? 'text-violet-600' : 'text-amber-600'

  return (
    <button type="button" onClick={() => !disabled && onToggle()}
      disabled={disabled}
      className={cn(
        'flex items-center gap-3 w-full px-4 py-3 rounded-[12px] border text-left transition-all duration-150',
        disabled ? 'opacity-40 cursor-not-allowed bg-surface-2 border-[rgba(0,0,0,0.06)]' :
        selected
          ? 'bg-brand-50 border-brand-200 shadow-[0_0_0_1px_rgba(79,70,229,0.1)]'
          : 'bg-white border-[rgba(0,0,0,0.08)] hover:border-[rgba(0,0,0,0.15)] hover:bg-surface-1'
      )}>
      <div className={cn('w-5 h-5 rounded-[5px] border-2 flex items-center justify-center shrink-0 transition-all',
        selected ? 'bg-brand-600 border-brand-600' : 'border-[rgba(0,0,0,0.2)]'
      )}>
        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
      <span className={cn('flex-1 text-[13px] font-medium', selected ? 'text-ink-1' : 'text-ink-2')}>{label}</span>
      <span className={cn('text-[11px] font-bold tabular-nums', cost === 0 ? 'text-emerald-600' : tierColor)}>
        {cost === 0 ? 'Gratuit' : `+${cost} cr`}
      </span>
    </button>
  )
}

// ── Credit pill ───────────────────────────────────────────────
function CreditPill({ cost, label }: { cost: number; label: string }) {
  const tierColor = cost === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
    cost <= 1 ? 'bg-brand-50 text-brand-700 border-brand-100' :
    cost <= 2 ? 'bg-violet-50 text-violet-700 border-violet-100' :
    'bg-amber-50 text-amber-700 border-amber-100'
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-pill border text-[11px] font-bold', tierColor)}>
      {cost === 0 ? <Check className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
      {cost === 0 ? 'Gratuit' : `${cost} cr`} · {label}
    </span>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function SearchPage() {
  const router = useRouter()
  const toast  = useToast()

  // Filters
  const [sectors, setSectors]   = useState<string[]>([])
  const [cities, setCities]     = useState<string[]>([])
  const [regions, setRegions]   = useState<string[]>([])
  const [effectif, setEffectif] = useState<string[]>([])
  const [nameSearch, setNameSearch] = useState('')
  const [maxResults, setMaxResults] = useState(50)

  // Fields
  const [selectedFields, setSelectedFields] = useState<FieldKey[]>(['phone', 'email'])
  const [activePreset, setActivePreset] = useState<string | null>('light')

  // UI state
  const [estimating, setEstimating] = useState(false)
  const [estimate, setEstimate] = useState<{ count: number; total_cost: number } | null>(null)
  const [launching, setLaunching] = useState(false)
  const [userCredits, setUserCredits] = useState<number | null>(null)

  // Credit balance fetch (lazy)
  useMemo(() => {
    fetch('/api/me/balance').then(r => r.json()).then(d => setUserCredits(d.balance ?? d.credits ?? null))
  }, [])

  const costPerBiz = useMemo(() =>
    selectedFields.reduce((s, f) => s + (FIELD_COSTS[f] ?? 0), 0),
    [selectedFields]
  )

  const estimatedCost = useMemo(() =>
    costPerBiz * maxResults,
    [costPerBiz, maxResults]
  )

  const hasFilters = sectors.length > 0 || cities.length > 0 || regions.length > 0 || effectif.length > 0 || nameSearch

  function toggleField(field: FieldKey) {
    setActivePreset(null)
    setSelectedFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    )
  }

  function applyPreset(preset: typeof PRESETS[0]) {
    setActivePreset(preset.id)
    setSelectedFields(preset.fields as FieldKey[])
  }

  async function handleEstimate() {
    setEstimating(true)
    try {
      const params = new URLSearchParams()
      if (sectors.length)  params.set('sectors', sectors.join(','))
      if (cities.length)   params.set('cities', cities.join(','))
      if (regions.length)  params.set('regions', regions.join(','))
      if (effectif.length) params.set('effectif', effectif.join(','))
      if (nameSearch)      params.set('name', nameSearch)
      params.set('fields', selectedFields.join(','))
      params.set('limit', maxResults.toString())

      const res = await fetch(`/api/search/estimate?${params}`)
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Erreur'); return }
      setEstimate({ count: data.count, total_cost: data.count * costPerBiz })
    } catch { toast.error('Erreur réseau') }
    finally { setEstimating(false) }
  }

  async function handleLaunch() {
    if (selectedFields.length === 0) { toast.error('Choisissez au moins un champ'); return }
    if (!hasFilters) { toast.error('Ajoutez au moins un filtre'); return }
    setLaunching(true)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: { sectors, cities, regions, effectif: effectif, name: nameSearch },
          fields:  selectedFields,
          limit:   maxResults,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Crédits insuffisants'); return }

      // Always store results in sessionStorage before navigating
      const qid = data.queryId || `local_${Date.now()}`
      try {
        sessionStorage.setItem(`query_${qid}`, JSON.stringify(data))
      } catch {}

      router.push(`/results?queryId=${qid}`)
    } catch { toast.error('Erreur réseau') }
    finally { setLaunching(false) }
  }

  const canAfford = userCredits === null || estimatedCost <= userCredits

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-reveal-in">
      <div>
        <h1 className="font-bold text-ink-1" style={{ fontSize: '24px', letterSpacing: '-0.8px' }}>
          Nouvelle recherche
        </h1>
        <p className="text-[14px] text-ink-3 mt-1">
          Configurez vos critères, choisissez vos champs, estimez le coût.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

        {/* ── LEFT: Filters + Fields ───────────────────────── */}
        <div className="space-y-5">

          {/* Presets */}
          <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] p-5 shadow-card">
            <p className="text-[12px] font-bold uppercase tracking-widest text-ink-4 mb-4 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" /> Démarrer avec un profil type
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PRESETS.map(p => (
                <button key={p.id} type="button" onClick={() => applyPreset(p)}
                  className={cn(
                    'text-left rounded-[12px] border p-3.5 transition-all hover:-translate-y-0.5',
                    activePreset === p.id
                      ? 'bg-brand-600 border-brand-600 shadow-[0_4px_16px_rgba(79,70,229,0.3)]'
                      : 'bg-white border-[rgba(0,0,0,0.08)] hover:border-brand-200 hover:shadow-card'
                  )}>
                  <div className="text-lg mb-1.5">{p.emoji}</div>
                  <p className={cn('font-bold text-[13px] leading-tight mb-0.5', activePreset === p.id ? 'text-white' : 'text-ink-1')}>
                    {p.label}
                  </p>
                  <p className={cn('text-[11px]', activePreset === p.id ? 'text-white/70' : 'text-ink-4')}>
                    {p.desc}
                  </p>
                  <div className={cn('mt-2 text-[11px] font-bold tabular-nums', activePreset === p.id ? 'text-white/90' : 'text-amber-600')}>
                    {p.costPerBiz} cr / entreprise
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] p-5 shadow-card space-y-4">
            <p className="text-[12px] font-bold uppercase tracking-widest text-ink-4 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" /> Filtres de ciblage
            </p>

            {/* Name search */}
            <div>
              <label className="label text-[12px]">Nom d&apos;entreprise <span className="text-ink-4 font-normal">(optionnel)</span></label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-4" />
                <input type="text" value={nameSearch} onChange={e => setNameSearch(e.target.value)}
                  className="input pl-9 text-sm" placeholder="Recherche libre..." />
                {nameSearch && (
                  <button onClick={() => setNameSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-ink-4 hover:text-ink-1" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MultiSelect label="Secteur d'activité" options={SECTORS} selected={sectors}
                onChange={setSectors} placeholder="Tous les secteurs" />
              <MultiSelect label="Ville" options={CITIES} selected={cities}
                onChange={setCities} placeholder="Toutes les villes" />
              <MultiSelect label="Région" options={REGIONS} selected={regions}
                onChange={setRegions} placeholder="Toutes les régions" />
              <MultiSelect label="Taille d'effectif" options={EFFECTIF_OPTIONS} selected={effectif}
                onChange={setEffectif} placeholder="Tous les effectifs" />
            </div>

            {/* Active filters summary */}
            {(sectors.length > 0 || cities.length > 0 || regions.length > 0 || effectif.length > 0) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[...sectors,...cities,...regions,...effectif].map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 bg-brand-50 border border-brand-100 text-brand-700 text-[11px] font-semibold px-2.5 py-1 rounded-pill">
                    {tag}
                    <button onClick={() => {
                      setSectors(s => s.filter(x => x !== tag))
                      setCities(s => s.filter(x => x !== tag))
                      setRegions(s => s.filter(x => x !== tag))
                      setEffectif(s => s.filter(x => x !== tag))
                    }}><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
                <button onClick={() => { setSectors([]); setCities([]); setRegions([]); setEffectif([]) }}
                  className="text-[11px] text-red-500 font-medium hover:underline ml-1">
                  Tout effacer
                </button>
              </div>
            )}
          </div>

          {/* Fields to unlock */}
          <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] p-5 shadow-card space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold uppercase tracking-widest text-ink-4 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-500" /> Champs à débloquer
              </p>
              {selectedFields.length > 0 && (
                <button onClick={() => { setSelectedFields([]); setActivePreset(null) }}
                  className="text-[11px] text-red-500 font-medium hover:underline">
                  Tout désélectionner
                </button>
              )}
            </div>

            {/* Always free */}
            <div>
              <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Check className="w-3 h-3" /> Toujours inclus — Gratuit
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {['name','secteur','ville','region','forme_juridique','status'].map(f => (
                  <div key={f} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-[9px] text-[12px] text-emerald-700 font-medium">
                    <Check className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                    {FIELD_LABELS[f] ?? f}
                  </div>
                ))}
              </div>
            </div>

            {/* Paid field groups */}
            {FIELD_GROUPS.map(group => (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className={cn('w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0', group.color)}>
                    <Lock className="w-3 h-3" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-ink-1">{group.label}</p>
                    <p className="text-[11px] text-ink-3">{group.desc}</p>
                  </div>
                </div>
                {group.warning && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-[10px] px-3 py-2 mb-2.5 text-[11px] text-amber-700">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {group.warningText}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.fields.map(field => (
                    <FieldToggle key={field} field={field}
                      selected={selectedFields.includes(field)}
                      onToggle={() => toggleField(field)} />
                  ))}
                </div>
              </div>
            ))}

            {/* Directions (DAF, DRH, etc) — NEW */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0 bg-rose-50 text-rose-600">
                  <Users className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-ink-1">Contacts directions</p>
                  <p className="text-[11px] text-ink-3">DAF, DRH, Achats, Marketing, Commercial — si disponible</p>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 rounded-[10px] px-3 py-2 mb-2.5 text-[11px] text-rose-700">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Ces contacts sont disponibles pour une sélection d&apos;entreprises. Le coût est déduit uniquement si le contact existe.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {([
                  { field: 'dir_daf_nom' as FieldKey,        label: '💰 DAF — Nom',       cost: 2 },
                  { field: 'dir_daf_email' as FieldKey,      label: '💰 DAF — E-mail',    cost: 5 },
                  { field: 'dir_rh_nom' as FieldKey,         label: '👥 DRH — Nom',       cost: 2 },
                  { field: 'dir_rh_email' as FieldKey,       label: '👥 DRH — E-mail',    cost: 5 },
                  { field: 'dir_achat_nom' as FieldKey,      label: '🛒 Dir. Achats — Nom', cost: 2 },
                  { field: 'dir_achat_email' as FieldKey,    label: '🛒 Dir. Achats — E-mail', cost: 5 },
                  { field: 'dir_marketing_nom' as FieldKey,  label: '📣 Dir. Marketing — Nom', cost: 2 },
                  { field: 'dir_marketing_email' as FieldKey,label: '📣 Dir. Marketing — E-mail', cost: 5 },
                  { field: 'dir_commercial_nom' as FieldKey, label: '📈 Dir. Commercial — Nom', cost: 2 },
                  { field: 'dir_commercial_email' as FieldKey,label: '📈 Dir. Commercial — E-mail', cost: 5 },
                ] as { field: FieldKey; label: string; cost: number }[]).map(({ field, label, cost }) => (
                  <button key={field} type="button"
                    onClick={() => toggleField(field)}
                    className={cn(
                      'flex items-center justify-between px-3.5 py-2.5 rounded-[10px] border text-left transition-all text-[12px]',
                      selectedFields.includes(field)
                        ? 'bg-rose-50 border-rose-200 text-rose-800 font-semibold'
                        : 'bg-white border-[rgba(0,0,0,0.08)] text-ink-2 hover:border-rose-200 hover:bg-rose-50/40'
                    )}>
                    <div className="flex items-center gap-2">
                      <div className={cn('w-4 h-4 rounded-[4px] border-2 flex items-center justify-center shrink-0',
                        selectedFields.includes(field) ? 'bg-rose-600 border-rose-600' : 'border-[rgba(0,0,0,0.2)]')}>
                        {selectedFields.includes(field) && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </div>
                      <span>{label}</span>
                    </div>
                    <span className={cn('font-bold text-[10px] tabular-nums shrink-0',
                      selectedFields.includes(field) ? 'text-rose-700' : 'text-ink-4')}>
                      +{cost} cr
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Summary + Launch ──────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-[70px]">

          {/* Quantity */}
          <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] p-5 shadow-card">
            <p className="text-[12px] font-bold uppercase tracking-widest text-ink-4 mb-4">
              Nombre d&apos;entreprises
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[32px] tabular-nums text-ink-1" style={{ letterSpacing: '-1px' }}>
                  {maxResults}
                </span>
                <span className="text-[13px] text-ink-3">résultats max</span>
              </div>
              <input type="range" min={5} max={500} step={5} value={maxResults}
                onChange={e => setMaxResults(parseInt(e.target.value))}
                className="w-full h-2 bg-surface-2 rounded-full appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                           [&::-webkit-slider-thumb]:bg-brand-600 [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm" />
              <div className="flex justify-between text-[11px] text-ink-4">
                <span>5</span><span>100</span><span>250</span><span>500</span>
              </div>
              {/* Quick presets */}
              <div className="flex gap-2 flex-wrap pt-1">
                {[10, 25, 50, 100, 200].map(n => (
                  <button key={n} type="button" onClick={() => setMaxResults(n)}
                    className={cn('px-3 py-1.5 rounded-pill text-[12px] font-semibold border transition-all',
                      maxResults === n ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-2 border-[rgba(0,0,0,0.1)] hover:border-brand-300')}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cost Summary */}
          <div className={cn('rounded-[18px] border p-5 shadow-card transition-all',
            !canAfford ? 'bg-red-50 border-red-200' : 'bg-white border-[rgba(0,0,0,0.07)]'
          )}>
            <p className="text-[12px] font-bold uppercase tracking-widest text-ink-4 mb-4">
              Récapitulatif
            </p>

            {/* Fields selected */}
            {selectedFields.length > 0 ? (
              <div className="space-y-2 mb-4">
                {selectedFields.map(f => {
                  const cost = FIELD_COSTS[f] ?? 0
                  const label = FIELD_LABELS[f] ?? f
                  return (
                    <div key={f} className="flex items-center justify-between text-[13px]">
                      <span className="text-ink-2 flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-ink-4" />{label}
                      </span>
                      <span className="font-semibold text-ink-1 tabular-nums">
                        {cost === 0 ? 'Gratuit' : `+${cost} cr/biz`}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[13px] text-ink-4 mb-4 text-center py-3">
                Aucun champ sélectionné
              </p>
            )}

            <div className="border-t border-[rgba(0,0,0,0.06)] pt-4 space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-3">Coût par entreprise</span>
                <span className="font-bold tabular-nums text-ink-1">{costPerBiz} cr</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-3">Max entreprises</span>
                <span className="font-bold tabular-nums text-ink-1">×{maxResults}</span>
              </div>
              <div className="flex justify-between py-2.5 bg-surface-1 -mx-1 px-3 rounded-[10px] mt-2">
                <span className="font-bold text-[15px] text-ink-1">Estimation max</span>
                <div className="text-right">
                  <span className="font-bold text-[20px] tabular-nums text-brand-700"
                    style={{ letterSpacing: '-0.5px' }}>
                    {formatNumber(estimatedCost)}
                  </span>
                  <span className="text-[13px] text-ink-3 ml-1">cr</span>
                </div>
              </div>
              {userCredits !== null && (
                <div className="flex justify-between text-[12px]">
                  <span className="text-ink-3">Votre solde</span>
                  <span className={cn('font-semibold tabular-nums', !canAfford ? 'text-red-600' : 'text-emerald-600')}>
                    {formatNumber(userCredits)} cr
                  </span>
                </div>
              )}
              {!canAfford && (
                <div className="flex items-center gap-2 text-[12px] text-red-600 font-medium bg-red-50 rounded-[8px] p-2.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Crédits insuffisants pour cette configuration.
                </div>
              )}
            </div>

            {/* Estimate bubble */}
            {estimate && (
              <div className="mt-3 bg-brand-50 border border-brand-100 rounded-[12px] p-3 text-[12px]">
                <p className="font-bold text-brand-800 mb-0.5">
                  ~{formatNumber(estimate.count)} entreprises trouvées
                </p>
                <p className="text-brand-600">
                  Coût réel estimé : <strong>{formatNumber(estimate.total_cost)} cr</strong>
                  {estimate.count < maxResults && ` (moins que le max de ${maxResults})`}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            <button onClick={handleEstimate} disabled={estimating || selectedFields.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-pill border border-[rgba(0,0,0,0.1)] bg-white text-ink-1 font-semibold text-[14px] hover:bg-surface-1 hover:border-[rgba(0,0,0,0.2)] transition-all disabled:opacity-40">
              {estimating ? (
                <><div className="w-4 h-4 border-2 border-ink-3 border-t-transparent rounded-full animate-spin" />Estimation…</>
              ) : (
                <><Zap className="w-4 h-4 text-amber-500" />Estimer le nombre de résultats</>
              )}
            </button>

            <button onClick={handleLaunch}
              disabled={launching || selectedFields.length === 0 || !hasFilters || !canAfford}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3.5 rounded-pill font-bold text-[15px] transition-all',
                (!selectedFields.length || !hasFilters || !canAfford)
                  ? 'bg-surface-2 text-ink-4 cursor-not-allowed'
                  : 'bg-ink-1 text-white hover:bg-ink-2 hover:-translate-y-0.5 active:scale-95 shadow-sm'
              )}>
              {launching ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Lancement…</>
              ) : (
                <><Sparkles className="w-5 h-5" />Lancer la recherche <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            {!hasFilters && selectedFields.length > 0 && (
              <p className="text-center text-[12px] text-ink-4">
                Ajoutez au moins un filtre (secteur, ville…) pour lancer.
              </p>
            )}
          </div>

          {/* Info box */}
          <div className="bg-surface-1 border border-[rgba(0,0,0,0.06)] rounded-[14px] p-4 text-[12px] text-ink-3 space-y-1.5">
            <p className="font-semibold text-ink-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-brand-500" /> Comment ça marche
            </p>
            <p>✓ Champs libres (nom, secteur, ville) toujours gratuits</p>
            <p>✓ Coût déduit uniquement pour les champs débloqués</p>
            <p>✓ Jamais facturé deux fois pour le même champ</p>
            <p>✓ Estimation = maximum — le coût réel peut être inférieur</p>
          </div>
        </div>
      </div>
    </div>
  )
}
