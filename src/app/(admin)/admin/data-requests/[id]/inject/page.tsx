'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import {
  ArrowLeft, Download, Loader2, FileText, AlertCircle, CheckCircle2,
  ArrowRight, Sparkles, X, Plus, Building2, Phone, Mail, Globe,
  UserRound, MapPin, Flag, Factory, Hash, EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ── Target schema the CRM understands ──────────────────────────
type TargetField =
  | 'company_name' | 'phone' | 'email' | 'website' | 'contact_name'
  | 'city' | 'country' | 'sector' | 'is_manufacturer' | 'ignore' | 'custom'

const TARGET_FIELDS: { value: TargetField; label: string; icon: React.ElementType; required?: boolean }[] = [
  { value: 'company_name',    label: "Nom de l'entreprise", icon: Building2,  required: true },
  { value: 'phone',           label: 'Téléphone',           icon: Phone     },
  { value: 'email',           label: 'E-mail',               icon: Mail      },
  { value: 'website',         label: 'Site web',             icon: Globe     },
  { value: 'contact_name',    label: 'Nom du contact',       icon: UserRound },
  { value: 'city',            label: 'Ville',                 icon: MapPin    },
  { value: 'country',         label: 'Pays',                  icon: Flag      },
  { value: 'sector',          label: 'Secteur',               icon: Hash      },
  { value: 'is_manufacturer', label: 'Fabricant (Oui/Non)',  icon: Factory   },
  { value: 'custom',          label: 'Champ personnalisé',    icon: Plus      },
  { value: 'ignore',          label: 'Ignorer cette colonne', icon: EyeOff    },
]

// ── Smart auto-detection heuristics ─────────────────────────────
const HEURISTICS: { field: TargetField; patterns: RegExp }[] = [
  { field: 'company_name',    patterns: /business.?name|nom.?entreprise|raison.?sociale|nom.?de.?l.?entreprise|company|entreprise|soci[ée]t[ée]|^name$/i },
  { field: 'is_manufacturer', patterns: /fabriquant|fabricant|manufactur/i },
  { field: 'phone',           patterns: /phone|t[ée]l[ée]phone|^tel$|gsm|num[ée]ro/i },
  { field: 'email',           patterns: /e-?mail|courriel/i },
  { field: 'website',         patterns: /web.?site|site.?web|^url$|^site$/i },
  { field: 'contact_name',    patterns: /dirigeant|contact|g[ée]rant|responsable/i },
  { field: 'city',            patterns: /^ville$|^city$/i },
  { field: 'country',         patterns: /^pays$|^country$/i },
  { field: 'sector',          patterns: /secteur|sector|activit[ée]|industry/i },
]

const TRUE_VALUE_PATTERNS = /^(oui|yes|true|vrai|1|y|x)$/i

function detectField(header: string, alreadyUsed: Set<TargetField>): TargetField {
  for (const { field, patterns } of HEURISTICS) {
    if (patterns.test(header.trim()) && (!alreadyUsed.has(field) || field === 'custom')) {
      return field
    }
  }
  return 'custom'
}

interface ParsedFile {
  headers: string[]
  rows: Record<string, string>[]
}

interface RequestInfo {
  id: string
  file_name: string
  file_path: string
  status: string
  user_notes: string | null
  profiles: { id: string; email: string; full_name: string | null }
}

export default function InjectPage() {
  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string

  const [request, setRequest]   = useState<RequestInfo | null>(null)
  const [loading, setLoading]   = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsed, setParsed]     = useState<ParsedFile | null>(null)
  const [mapping, setMapping]   = useState<Record<string, TargetField>>({})
  const [customNames, setCustomNames] = useState<Record<string, string>>({}) // header -> custom field display name
  const [manufacturerTrueValues, setManufacturerTrueValues] = useState<Set<string>>(new Set())
  const [injecting, setInjecting] = useState(false)
  const [result, setResult] = useState<{ insertedCount: number; skipped: number } | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ── Load request metadata ───────────────────────────────────
  useEffect(() => {
    fetch(`/api/admin/data-requests?id=${requestId}`)
      .then(r => r.json())
      .then(d => {
        const found = (d.requests ?? []).find((r: RequestInfo) => r.id === requestId)
        setRequest(found ?? null)
      })
      .finally(() => setLoading(false))
  }, [requestId])

  // ── Download + parse the file ───────────────────────────────
  const downloadAndParse = useCallback(async () => {
    setDownloading(true)
    setParseError(null)
    try {
      const res = await fetch(`/api/admin/data-requests/${requestId}`)
      if (!res.ok) throw new Error('Impossible de récupérer le fichier')
      const { url, file_name } = await res.json()

      const fileRes = await fetch(url)
      const buf = await fileRes.arrayBuffer()

      const isExcel = /\.xlsx?$/i.test(file_name)
      let headers: string[] = []
      let rows: Record<string, string>[] = []

      if (isExcel) {
        const wb = XLSX.read(buf, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' })
        if (json.length < 1) throw new Error('Fichier vide')
        headers = (json[0] as string[]).map(h => String(h ?? '').trim()).filter(Boolean)
        rows = json.slice(1).map(row => {
          const obj: Record<string, string> = {}
          headers.forEach((h, i) => { obj[h] = String((row as string[])[i] ?? '').trim() })
          return obj
        }).filter(r => Object.values(r).some(v => v !== ''))
      } else {
        const text = new TextDecoder('utf-8').decode(buf)
        const lines = text.split(/\r?\n/).filter(l => l.trim())
        if (lines.length < 1) throw new Error('Fichier vide')
        const sep = lines[0].includes(';') ? ';' : ','
        headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').trim()).filter(Boolean)
        rows = lines.slice(1).map(line => {
          const vals = line.split(sep).map(v => v.replace(/^"|"$/g, '').trim())
          const obj: Record<string, string> = {}
          headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
          return obj
        }).filter(r => Object.values(r).some(v => v !== ''))
      }

      if (headers.length === 0) throw new Error('Aucune colonne détectée dans le fichier')

      setParsed({ headers, rows })

      // Auto-detect column mapping
      const used = new Set<TargetField>()
      const autoMap: Record<string, TargetField> = {}
      headers.forEach(h => {
        const detected = detectField(h, used)
        autoMap[h] = detected
        if (detected !== 'custom' && detected !== 'ignore') used.add(detected)
      })
      setMapping(autoMap)

      // Pre-select obvious "true" values for any manufacturer-mapped column
      const mfgHeader = headers.find(h => autoMap[h] === 'is_manufacturer')
      if (mfgHeader) {
        const distinctVals = [...new Set(rows.map(r => r[mfgHeader]).filter(Boolean))]
        const trueVals = distinctVals.filter(v => TRUE_VALUE_PATTERNS.test(v.trim()))
        setManufacturerTrueValues(new Set(trueVals))
      }
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : 'Erreur lors du parsing du fichier')
    } finally {
      setDownloading(false)
    }
  }, [requestId])

  useEffect(() => { downloadAndParse() }, [downloadAndParse])

  // ── Derived: the manufacturer-mapped column header (if any) ──
  const manufacturerHeader = useMemo(() => {
    if (!parsed) return null
    return parsed.headers.find(h => mapping[h] === 'is_manufacturer') ?? null
  }, [parsed, mapping])

  const manufacturerDistinctValues = useMemo(() => {
    if (!parsed || !manufacturerHeader) return []
    return [...new Set(parsed.rows.map(r => r[manufacturerHeader]).filter(Boolean))]
  }, [parsed, manufacturerHeader])

  // ── Build mapped rows ready for injection ───────────────────
  const mappedRows = useMemo(() => {
    if (!parsed) return []
    return parsed.rows.map(row => {
      const out: Record<string, unknown> = { custom_fields: {} as Record<string, string> }
      for (const header of parsed.headers) {
        const target = mapping[header] ?? 'custom'
        const raw = row[header] ?? ''
        if (target === 'ignore') continue
        if (target === 'is_manufacturer') {
          out.is_manufacturer = raw ? manufacturerTrueValues.has(raw) : null
        } else if (target === 'custom') {
          if (raw) (out.custom_fields as Record<string, string>)[customNames[header] || header] = raw
        } else {
          out[target] = raw || null
        }
      }
      return out
    })
  }, [parsed, mapping, manufacturerTrueValues, customNames])

  const validRowCount = mappedRows.filter(r => r.company_name).length
  const companyNameMapped = Object.values(mapping).includes('company_name')

  async function handleInject() {
    if (!companyNameMapped) {
      setSubmitError('Vous devez mapper une colonne vers "Nom de l\'entreprise" avant d\'injecter.')
      return
    }
    setInjecting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/admin/data-requests/${requestId}/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: mappedRows }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Erreur lors de l\'injection')
      setResult({ insertedCount: d.insertedCount, skipped: d.skipped })
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Erreur serveur')
    } finally {
      setInjecting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-ink-4" /></div>
  }

  if (!request) {
    return (
      <div className="text-center py-24">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-[14px] text-ink-3">Demande introuvable.</p>
        <Link href="/admin/data-requests" className="text-[13px] text-brand-600 font-semibold mt-3 inline-block">← Retour aux imports</Link>
      </div>
    )
  }

  // ── Success state ───────────────────────────────────────────
  if (result) {
    return (
      <div className="max-w-[600px] mx-auto py-16 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-[22px] font-extrabold text-ink-1 mb-2">Injection réussie ✓</h1>
        <p className="text-[14px] text-ink-3 mb-1">
          <strong className="text-ink-1">{result.insertedCount}</strong> lead(s) ajouté(s) au CRM de{' '}
          <strong className="text-ink-1">{request.profiles?.full_name || request.profiles?.email}</strong>.
        </p>
        {result.skipped > 0 && (
          <p className="text-[13px] text-amber-600 mb-6">{result.skipped} ligne(s) ignorée(s) (nom d&apos;entreprise manquant).</p>
        )}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link href="/admin/data-requests" className="btn-brand btn-md">Retour aux imports</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1100px] mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/data-requests" className="p-2 rounded-lg hover:bg-surface-2 transition-colors">
          <ArrowLeft className="w-4 h-4 text-ink-3" />
        </Link>
        <div className="flex-1">
          <h1 className="text-[20px] font-extrabold text-ink-1" style={{ letterSpacing: '-0.5px' }}>
            Mapper &amp; Injecter — {request.file_name}
          </h1>
          <p className="text-[13px] text-ink-3">
            Client: <strong>{request.profiles?.full_name || request.profiles?.email}</strong>
            {request.status === 'completed' && (
              <span className="ml-2 text-emerald-600 font-semibold">· Déjà injecté précédemment</span>
            )}
          </p>
        </div>
      </div>

      {request.status === 'completed' && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[13px] text-amber-800">
            Cette demande a déjà été marquée comme terminée. Ré-injecter créera de <strong>nouveaux</strong> leads en plus des leads existants (pas de fusion automatique) — vérifiez d&apos;abord dans le CRM du client si c&apos;est nécessaire.
          </p>
        </div>
      )}

      {/* Loading / error states for file parsing */}
      {downloading && (
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500 mx-auto mb-3" />
          <p className="text-[13px] text-ink-4">Téléchargement et analyse du fichier…</p>
        </div>
      )}

      {parseError && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-red-700 mb-1">Erreur de lecture du fichier</p>
            <p className="text-[13px] text-red-600">{parseError}</p>
            <button onClick={downloadAndParse} className="text-[12px] font-semibold text-red-700 underline mt-2">Réessayer</button>
          </div>
        </div>
      )}

      {/* Main mapping UI */}
      {parsed && !downloading && (
        <>
          {/* Summary bar */}
          <div className="flex flex-wrap items-center gap-4 bg-brand-50 border border-brand-100 rounded-xl px-5 py-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />
              <span className="text-[13px] font-semibold text-brand-800">{parsed.rows.length} ligne(s) détectée(s)</span>
            </div>
            <div className="w-px h-4 bg-brand-200" />
            <span className="text-[13px] text-brand-700">{parsed.headers.length} colonne(s)</span>
            <div className="w-px h-4 bg-brand-200" />
            <span className={cn('text-[13px] font-semibold', validRowCount > 0 ? 'text-emerald-700' : 'text-red-600')}>
              {validRowCount} ligne(s) prête(s) à injecter
            </span>
          </div>

          {/* Column mapping table */}
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.05)]">
              <h3 className="text-[14px] font-bold text-ink-1">Mapping des colonnes</h3>
              <p className="text-[12px] text-ink-4 mt-0.5">Pour chaque colonne du fichier, choisissez où ses données doivent aller dans le CRM.</p>
            </div>
            <div className="divide-y divide-[rgba(0,0,0,0.05)]">
              {parsed.headers.map(header => {
                const target = mapping[header] ?? 'custom'
                const sample = parsed.rows.slice(0, 3).map(r => r[header]).filter(Boolean).join(' · ')
                return (
                  <div key={header} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-1 transition-colors">
                    <div className="w-[200px] shrink-0">
                      <p className="text-[13px] font-semibold text-ink-1 truncate">{header}</p>
                      <p className="text-[11px] text-ink-4 truncate">{sample || '—'}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-ink-5 shrink-0" />
                    <select
                      value={target}
                      onChange={e => setMapping(prev => ({ ...prev, [header]: e.target.value as TargetField }))}
                      className="flex-1 max-w-[260px] border border-[rgba(0,0,0,0.1)] rounded-lg px-3 py-2 text-[13px] text-ink-2 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 bg-white"
                    >
                      {TARGET_FIELDS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}{f.required ? ' *' : ''}</option>
                      ))}
                    </select>
                    {target === 'custom' && (
                      <input
                        type="text"
                        placeholder="Nom du champ (optionnel)"
                        value={customNames[header] ?? ''}
                        onChange={e => setCustomNames(prev => ({ ...prev, [header]: e.target.value }))}
                        className="w-[180px] border border-[rgba(0,0,0,0.1)] rounded-lg px-3 py-2 text-[12px] text-ink-2 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Manufacturer true-value picker */}
          {manufacturerHeader && manufacturerDistinctValues.length > 0 && (
            <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] p-5">
              <h3 className="text-[14px] font-bold text-ink-1 mb-1 flex items-center gap-2">
                <Factory className="w-4 h-4 text-brand-600" /> Valeurs &quot;Fabricant = Oui&quot;
              </h3>
              <p className="text-[12px] text-ink-4 mb-4">
                Colonne <strong>{manufacturerHeader}</strong> — cochez les valeurs qui signifient &quot;Oui, c&apos;est un fabricant&quot;.
              </p>
              <div className="flex flex-wrap gap-2">
                {manufacturerDistinctValues.map(val => {
                  const checked = manufacturerTrueValues.has(val)
                  return (
                    <button
                      key={val}
                      onClick={() => setManufacturerTrueValues(prev => {
                        const next = new Set(prev)
                        if (checked) next.delete(val); else next.add(val)
                        return next
                      })}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-pill border text-[12px] font-semibold transition-colors',
                        checked ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-surface-1 border-[rgba(0,0,0,0.1)] text-ink-3 hover:border-[rgba(0,0,0,0.2)]'
                      )}
                    >
                      {checked ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-current" />}
                      {val}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Live preview */}
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.05)]">
              <h3 className="text-[14px] font-bold text-ink-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600" /> Aperçu du résultat (5 premières lignes)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-surface-1 border-b border-[rgba(0,0,0,0.06)]">
                    <th className="px-4 py-2 text-left font-semibold text-ink-4">Entreprise</th>
                    <th className="px-4 py-2 text-left font-semibold text-ink-4">Téléphone</th>
                    <th className="px-4 py-2 text-left font-semibold text-ink-4">Email</th>
                    <th className="px-4 py-2 text-left font-semibold text-ink-4">Ville</th>
                    <th className="px-4 py-2 text-left font-semibold text-ink-4">Pays</th>
                    <th className="px-4 py-2 text-left font-semibold text-ink-4">Fabricant</th>
                    <th className="px-4 py-2 text-left font-semibold text-ink-4">Champs perso.</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedRows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-[rgba(0,0,0,0.04)] last:border-0">
                      <td className="px-4 py-2.5 font-semibold text-ink-1">{(row.company_name as string) || <span className="text-red-400 italic font-normal">manquant</span>}</td>
                      <td className="px-4 py-2.5 text-ink-3 font-mono">{(row.phone as string) || '—'}</td>
                      <td className="px-4 py-2.5 text-ink-3">{(row.email as string) || '—'}</td>
                      <td className="px-4 py-2.5 text-ink-3">{(row.city as string) || '—'}</td>
                      <td className="px-4 py-2.5 text-ink-3">{(row.country as string) || '—'}</td>
                      <td className="px-4 py-2.5">
                        {row.is_manufacturer === true ? <span className="text-emerald-600 font-semibold">Oui</span>
                          : row.is_manufacturer === false ? <span className="text-ink-4">Non</span> : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-ink-4 max-w-[200px] truncate">
                        {Object.keys((row.custom_fields as Record<string,string>) ?? {}).length > 0
                          ? Object.entries(row.custom_fields as Record<string,string>).map(([k,v]) => `${k}: ${v}`).join(' · ')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-4 text-[13px] text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />{submitError}
            </div>
          )}

          {/* Submit bar */}
          <div className="sticky bottom-4 bg-white border border-[rgba(0,0,0,0.1)] rounded-2xl shadow-floating p-4 flex items-center justify-between">
            <div>
              {!companyNameMapped && (
                <p className="text-[12px] text-red-600 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Mappez une colonne vers &quot;Nom de l&apos;entreprise&quot; pour continuer
                </p>
              )}
              {companyNameMapped && (
                <p className="text-[13px] text-ink-3">
                  Prêt à injecter <strong className="text-ink-1">{validRowCount} lead(s)</strong> dans le CRM de{' '}
                  <strong className="text-ink-1">{request.profiles?.full_name || request.profiles?.email}</strong>
                </p>
              )}
            </div>
            <button
              onClick={handleInject}
              disabled={!companyNameMapped || validRowCount === 0 || injecting}
              className="btn-brand btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {injecting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Injection en cours…</> : <>Injecter {validRowCount} lead(s) →</>}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
