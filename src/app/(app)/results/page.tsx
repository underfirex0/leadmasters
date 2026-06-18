'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Download, Lock, Loader2, AlertCircle, RefreshCw,
  Building2, CheckCircle, ChevronDown, ChevronUp, Phone, Mail,
  Globe, MapPin, Users, TrendingUp, UserRound, ExternalLink,
  Plus, CheckSquare
} from 'lucide-react'
import { FIELD_COSTS, FIELD_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import type { MaskedBusiness, SearchResult, UnlockResponse } from '@/types'

function LockBtn({ cost, state, onClick }: {
  cost: number
  state: 'idle' | 'loading' | 'done' | 'error'
  onClick: () => void
}) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      disabled={state === 'loading'}
      className={cn(
        'inline-flex items-center gap-1 text-xs font-semibold rounded-lg px-2 py-1 transition-all border',
        state === 'loading' ? 'text-slate-400 bg-slate-50 border-slate-200 cursor-wait' :
        state === 'error'   ? 'text-red-600 bg-red-50 border-red-200' :
        'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 cursor-pointer'
      )}
    >
      {state === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
      {state === 'loading' ? '…' : state === 'error' ? 'Erreur' : `${cost} cr`}
    </button>
  )
}

function FieldRow({ icon: Icon, label, value, field, bizId, cost, unlockState, onUnlock }: {
  icon: React.ElementType
  label: string
  value: string | null
  field: string
  bizId: string
  cost?: number
  unlockState: Record<string, 'idle'|'loading'|'done'|'error'>
  onUnlock: (bizId: string, field: string) => void
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        {value ? (
          <p className="text-sm text-slate-800 font-mono break-all">{value}</p>
        ) : cost !== undefined ? (
          <LockBtn
            cost={cost}
            state={unlockState[`${bizId}:${field}`] || 'idle'}
            onClick={() => onUnlock(bizId, field)}
          />
        ) : (
          <p className="text-xs text-slate-300 italic">—</p>
        )}
      </div>
    </div>
  )
}

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryId = searchParams.get('queryId')

  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unlockState, setUnlockState] = useState<Record<string, 'idle'|'loading'|'done'|'error'>>({})
  const [balance, setBalance] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const toast = useToast()
  const [addingCRM, setAddingCRM] = useState<Record<string, boolean>>({})
  const [addedCRM, setAddedCRM] = useState<Set<string>>(new Set())
  const [sendingAll, setSendingAll] = useState(false)
  const [allSent, setAllSent] = useState(false)

  const loadResults = useCallback(async () => {
    if (!queryId || queryId === 'undefined') { router.push('/search'); return }
    setLoading(true); setError(null)
    // Always try sessionStorage first
    try {
      const cached = sessionStorage.getItem(`query_${queryId}`)
      if (cached) {
        const d: SearchResult = JSON.parse(cached)
        setResult(d); setBalance(d.newBalance ?? null)
        setLoading(false); return
      }
    } catch {}
    // Only hit the API for real UUIDs (not local_ keys)
    if (queryId.startsWith('local_')) {
      setError('Résultats expirés. Veuillez relancer la recherche.')
      setLoading(false); return
    }
    try {
      const res = await fetch(`/api/search/results?queryId=${queryId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setResult(data); setBalance(data.newBalance ?? null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally { setLoading(false) }
  }, [queryId, router])

  useEffect(() => { loadResults() }, [loadResults])

  async function handleUnlock(businessId: string, field: string) {
    const key = `${businessId}:${field}`
    setUnlockState(s => ({ ...s, [key]: 'loading' }))
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, field }),
      })
      const data: UnlockResponse & { error?: string; available?: number; required?: number } = await res.json()
      if (!res.ok) {
        if (res.status === 402) alert(`Crédits insuffisants : ${data.available} cr disponibles, ${data.required} cr requis.`)
        else toast.error(data.error || 'Erreur')
        setUnlockState(s => ({ ...s, [key]: 'error' })); return
      }
      setResult(prev => {
        if (!prev) return prev
        const updated = { ...prev, businesses: prev.businesses.map(b =>
          b.id === businessId ? { ...b, unlocked: { ...b.unlocked, [field]: data.value } } : b
        ), newBalance: data.newBalance ?? prev.newBalance }
        sessionStorage.setItem(`query_${queryId}`, JSON.stringify(updated))
        return updated
      })
      setBalance(data.newBalance ?? balance)
      setUnlockState(s => ({ ...s, [key]: 'done' }))
    } catch { setUnlockState(s => ({ ...s, [key]: 'error' })) }
  }

  async function addToCRM(bizId: string) {
    setAddingCRM(p => ({ ...p, [bizId]: true }))
    try {
      await fetch('/api/crm/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessIds: [bizId], queryId }),
      })
      setAddedCRM(p => new Set(Array.from(p).concat(bizId)))
    } finally { setAddingCRM(p => ({ ...p, [bizId]: false })) }
  }

  async function sendAllToCRM() {
    if (!result) return
    setSendingAll(true)
    try {
      await fetch('/api/crm/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessIds: result.businesses.map(b => b.id), queryId }),
      })
      setAllSent(true)
      toast.success(`${result.businesses.length} leads envoyés au CRM !`)
      setAddedCRM(new Set(result.businesses.map(b => b.id)))
    } finally { setSendingAll(false) }
  }

  async function handleExport() {
    if (!queryId) return
    setExporting(true)
    try {
      const res = await fetch(`/api/export?queryId=${queryId}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `leadscout-export-${queryId.slice(0, 8)}.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error("Erreur lors de l'export") } finally { setExporting(false) }
  }

  function getVal(biz: MaskedBusiness, field: string): string | null {
    return biz.unlocked?.[field] || (biz as Record<string, unknown>)[field] as string | null
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24">
      <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-4" />
      <p className="text-slate-500">Chargement des résultats…</p>
    </div>
  )
  if (error) return (
    <div className="flex flex-col items-center justify-center py-24">
      <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
      <p className="text-red-600 font-medium mb-4">{error}</p>
      <div className="flex gap-3">
        <button onClick={loadResults} className="btn-secondary flex items-center gap-2"><RefreshCw className="w-4 h-4" />Réessayer</button>
        <Link href="/search" className="btn-primary">Nouvelle recherche</Link>
      </div>
    </div>
  )
  if (!result) return null

  const { businesses, totalCount, creditsSpent, fieldsRequested, filters } = result
  const displayCount = businesses.length
  const paidFields = fieldsRequested.filter(f => FIELD_COSTS[f] !== undefined)

  // Build filter summary
  const filterParts: string[] = []
  const f = filters as Record<string, unknown>
  if (Array.isArray(f?.sectors) && f.sectors.length) filterParts.push((f.sectors as string[]).join(', '))
  if (Array.isArray(f?.cities)  && f.cities.length)  filterParts.push((f.cities as string[]).join(', '))
  if (typeof f?.sector === 'string') filterParts.push(f.sector)
  if (typeof f?.city   === 'string') filterParts.push(f.city)

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/search" className="btn-secondary p-2"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {displayCount} entreprise{displayCount > 1 ? 's' : ''}
              {totalCount > displayCount ? ` · ${totalCount} trouvées` : ''}
              {filterParts.length > 0 ? ` — ${filterParts.join(' · ')}` : ''}
            </h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-sm text-slate-500">{creditsSpent} cr dépensés</span>
              {balance !== null && <span className="text-sm text-amber-700 font-semibold">◆ {balance.toLocaleString()} cr</span>}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Send all to CRM */}
          <button
            onClick={sendAllToCRM}
            disabled={sendingAll || allSent || businesses.length === 0}
            className={cn(
              'flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg transition-all border',
              allSent
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default'
                : 'bg-purple-600 hover:bg-purple-700 border-purple-600 text-white'
            )}
          >
            {sendingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : allSent ? <CheckSquare className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {allSent ? 'Envoyé au CRM' : 'Tout envoyer au CRM'}
          </button>

          <button onClick={handleExport} disabled={exporting || businesses.length === 0} className="btn-secondary flex items-center gap-2 text-sm">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            CSV
          </button>
        </div>
      </div>

      {businesses.length === 0 ? (
        <div className="card p-16 text-center">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-4">Aucune entreprise ne correspond à ces critères.</p>
          <Link href="/search" className="btn-primary">Modifier les filtres</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="w-8 px-3 py-3" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Entreprise</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Ville</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Téléphone {!paidFields.includes('phone') && <Lock className="w-3 h-3 inline text-amber-400 ml-0.5" />}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  E-mail {!paidFields.includes('email') && <Lock className="w-3 h-3 inline text-amber-400 ml-0.5" />}
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CRM</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map(biz => {
                const isExp = expandedId === biz.id
                const inCRM = addedCRM.has(biz.id)
                const phone = getVal(biz, 'phone')
                const email = getVal(biz, 'email')

                return (
                  <>
                    <tr
                      key={biz.id}
                      className={cn('border-b border-slate-100 cursor-pointer transition-colors', isExp ? 'bg-indigo-50/30' : 'hover:bg-slate-50/60')}
                      onClick={() => setExpandedId(isExp ? null : biz.id)}
                    >
                      {/* Expand toggle */}
                      <td className="px-3 py-3 text-slate-400">
                        {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </td>

                      {/* Company */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 leading-tight">{biz.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600 font-medium">{biz.sector}</span>
                          {biz.legal_form && <span className="text-xs text-slate-400">{biz.legal_form}</span>}
                        </div>
                      </td>

                      {/* City */}
                      <td className="px-4 py-3 text-slate-600 hidden sm:table-cell whitespace-nowrap">{biz.city}</td>

                      {/* Phone */}
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        {phone ? (
                          <a href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
                            className="font-mono text-xs text-brand-600 hover:underline flex items-center gap-1"
                            onClick={e => e.stopPropagation()}>
                            <Phone className="w-3 h-3" />{phone}
                          </a>
                        ) : paidFields.includes('phone') ? (
                          <span className="text-xs text-slate-300 italic">—</span>
                        ) : (
                          <LockBtn cost={FIELD_COSTS.phone} state={unlockState[`${biz.id}:phone`] || 'idle'} onClick={() => handleUnlock(biz.id, 'phone')} />
                        )}
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 hidden md:table-cell" onClick={e => e.stopPropagation()}>
                        {email ? (
                          <a href={`mailto:${email}`}
                            className="text-xs text-brand-600 hover:underline flex items-center gap-1 max-w-[200px] truncate"
                            onClick={e => e.stopPropagation()}>
                            <Mail className="w-3 h-3 shrink-0" /><span className="truncate">{email}</span>
                          </a>
                        ) : paidFields.includes('email') ? (
                          <span className="text-xs text-slate-300 italic">—</span>
                        ) : (
                          <LockBtn cost={FIELD_COSTS.email} state={unlockState[`${biz.id}:email`] || 'idle'} onClick={() => handleUnlock(biz.id, 'email')} />
                        )}
                      </td>

                      {/* CRM */}
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => !inCRM && addToCRM(biz.id)}
                          disabled={inCRM || addingCRM[biz.id]}
                          className={cn(
                            'p-1.5 rounded-lg transition-all',
                            inCRM ? 'text-emerald-600 bg-emerald-50 cursor-default' : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
                          )}
                          title={inCRM ? 'Déjà dans le CRM' : 'Ajouter au CRM'}
                        >
                          {addingCRM[biz.id] ? <Loader2 className="w-4 h-4 animate-spin" /> :
                           inCRM ? <CheckCircle className="w-4 h-4" /> :
                           <Plus className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded detail panel */}
                    {isExp && (
                      <tr key={`${biz.id}-exp`} className="bg-indigo-50/20 border-b border-slate-100">
                        <td colSpan={6} className="px-6 py-5">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {/* Contact details */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" /> Contact
                              </h4>
                              <FieldRow icon={Phone} label="Téléphone" field="phone" bizId={biz.id}
                                value={getVal(biz, 'phone')} cost={!paidFields.includes('phone') ? FIELD_COSTS.phone : undefined}
                                unlockState={unlockState} onUnlock={handleUnlock} />
                              <FieldRow icon={Mail} label="E-mail" field="email" bizId={biz.id}
                                value={getVal(biz, 'email')} cost={!paidFields.includes('email') ? FIELD_COSTS.email : undefined}
                                unlockState={unlockState} onUnlock={handleUnlock} />
                              <FieldRow icon={Globe} label="Site web" field="website" bizId={biz.id}
                                value={getVal(biz, 'website')} cost={!paidFields.includes('website') ? FIELD_COSTS.website : undefined}
                                unlockState={unlockState} onUnlock={handleUnlock} />
                              <FieldRow icon={MapPin} label="Adresse" field="address" bizId={biz.id}
                                value={getVal(biz, 'address')} cost={!paidFields.includes('address') ? FIELD_COSTS.address : undefined}
                                unlockState={unlockState} onUnlock={handleUnlock} />
                            </div>

                            {/* Dirigeant */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                <UserRound className="w-3.5 h-3.5" /> Dirigeant
                              </h4>
                              <FieldRow icon={UserRound} label="Nom" field="dirigeant_name" bizId={biz.id}
                                value={getVal(biz, 'dirigeant_name')} cost={!paidFields.includes('dirigeant_name') ? FIELD_COSTS.dirigeant_name : undefined}
                                unlockState={unlockState} onUnlock={handleUnlock} />
                              <FieldRow icon={Phone} label="Téléphone direct" field="dirigeant_phone" bizId={biz.id}
                                value={getVal(biz, 'dirigeant_phone')} cost={!paidFields.includes('dirigeant_phone') ? FIELD_COSTS.dirigeant_phone : undefined}
                                unlockState={unlockState} onUnlock={handleUnlock} />
                              <FieldRow icon={Mail} label="E-mail direct" field="dirigeant_email" bizId={biz.id}
                                value={getVal(biz, 'dirigeant_email')} cost={!paidFields.includes('dirigeant_email') ? FIELD_COSTS.dirigeant_email : undefined}
                                unlockState={unlockState} onUnlock={handleUnlock} />
                            </div>

                            {/* Company details */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5" /> Entreprise
                              </h4>
                              <FieldRow icon={Users} label="Effectif" field="effectif_label" bizId={biz.id}
                                value={getVal(biz, 'effectif_label')} cost={!paidFields.includes('effectif_label') ? FIELD_COSTS.effectif_label : undefined}
                                unlockState={unlockState} onUnlock={handleUnlock} />
                              <FieldRow icon={TrendingUp} label="Chiffre d'affaires" field="revenue_label" bizId={biz.id}
                                value={getVal(biz, 'revenue_label')} cost={!paidFields.includes('revenue_label') ? FIELD_COSTS.revenue_label : undefined}
                                unlockState={unlockState} onUnlock={handleUnlock} />
                              <div className="pt-2">
                                <button onClick={() => !addedCRM.has(biz.id) && addToCRM(biz.id)}
                                  disabled={addedCRM.has(biz.id) || addingCRM[biz.id]}
                                  className={cn('flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border transition-all w-full justify-center',
                                    addedCRM.has(biz.id) ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default' : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100')}>
                                  {addingCRM[biz.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : addedCRM.has(biz.id) ? <CheckCircle className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                  {addedCRM.has(biz.id) ? 'Ajouté au CRM' : 'Ajouter au CRM'}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Direction contacts row */}
                          {(() => {
                            const dirs = [
                              { key: 'daf',        label: '💰 DAF',              nom: 'dir_daf_nom',        email: 'dir_daf_email',        tel: 'dir_daf_tel' },
                              { key: 'rh',         label: '👥 DRH',              nom: 'dir_rh_nom',         email: 'dir_rh_email',         tel: 'dir_rh_tel' },
                              { key: 'achat',      label: '🛒 Dir. Achats',      nom: 'dir_achat_nom',      email: 'dir_achat_email',      tel: 'dir_achat_tel' },
                              { key: 'marketing',  label: '📣 Dir. Marketing',   nom: 'dir_marketing_nom',  email: 'dir_marketing_email',  tel: 'dir_marketing_tel' },
                              { key: 'commercial', label: '📈 Dir. Commercial',  nom: 'dir_commercial_nom', email: 'dir_commercial_email', tel: 'dir_commercial_tel' },
                            ]
                            const hasDirs = dirs.some(d =>
                              getVal(biz, d.nom) || getVal(biz, d.email) || getVal(biz, d.tel) ||
                              paidFields.includes(d.nom) || paidFields.includes(d.email)
                            )
                            if (!hasDirs) return null
                            return (
                              <div className="mt-4 pt-4 border-t border-slate-200">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                  <UserRound className="w-3.5 h-3.5" /> Contacts directions
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                  {dirs.map(dir => {
                                    const nom   = getVal(biz, dir.nom)
                                    const email = getVal(biz, dir.email)
                                    const tel   = getVal(biz, dir.tel)
                                    const nomLocked   = !nom   && paidFields.includes(dir.nom)
                                    const emailLocked = !email && paidFields.includes(dir.email)
                                    if (!nom && !email && !tel && !nomLocked && !emailLocked) return null
                                    return (
                                      <div key={dir.key} className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5">
                                        <p className="text-[11px] font-bold text-slate-500">{dir.label}</p>
                                        {nom ? (
                                          <p className="text-[12px] font-semibold text-slate-800">{nom}</p>
                                        ) : paidFields.includes(dir.nom) ? (
                                          <LockBtn cost={FIELD_COSTS[dir.nom] ?? 2} state={unlockState[`${biz.id}:${dir.nom}`] || 'idle'} onClick={() => handleUnlock(biz.id, dir.nom)} />
                                        ) : null}
                                        {email ? (
                                          <a href={`mailto:${email}`} className="text-[11px] text-brand-600 hover:underline truncate block">{email}</a>
                                        ) : paidFields.includes(dir.email) ? (
                                          <LockBtn cost={FIELD_COSTS[dir.email] ?? 5} state={unlockState[`${biz.id}:${dir.email}`] || 'idle'} onClick={() => handleUnlock(biz.id, dir.email)} />
                                        ) : null}
                                        {tel && <p className="text-[11px] font-mono text-slate-600">{tel}</p>}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })()}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center">
        Cliquez sur une ligne pour voir tous les détails · Verrou = débloqué à la carte
      </p>
    </div>
  )
}
