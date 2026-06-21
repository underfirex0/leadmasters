'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import { Upload, FileText, X, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ParsedRow { [key: string]: string }
interface UploadRequest {
  id: string
  file_name: string
  estimated_rows: number | null
  status: string
  user_notes: string | null
  admin_notes: string | null
  created_at: string
}

const STATUS_CONFIG = {
  pending:    { label: 'En attente',    color: 'bg-amber-50 text-amber-700 border-amber-200',   icon: Clock },
  processing: { label: 'En cours',      color: 'bg-brand-50 text-brand-700 border-brand-200',   icon: Loader2 },
  completed:  { label: 'Terminé ✓',    color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rejected:   { label: 'Refusé',        color: 'bg-red-50 text-red-700 border-red-200',          icon: AlertCircle },
}

function parseCSVPreview(text: string): { headers: string[]; rows: ParsedRow[]; totalLines: number } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [], totalLines: 0 }
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').trim())
  const rows: ParsedRow[] = []
  for (let i = 1; i < Math.min(6, lines.length); i++) {
    const vals = lines[i].split(sep).map(v => v.replace(/^"|"$/g, '').trim())
    const row: ParsedRow = {}
    headers.forEach((h, j) => { row[h] = vals[j] ?? '' })
    rows.push(row)
  }
  return { headers, rows, totalLines: lines.length - 1 }
}

function parseExcelPreview(buf: ArrayBuffer): { headers: string[]; rows: ParsedRow[]; totalLines: number } {
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' })
  if (json.length < 1) return { headers: [], rows: [], totalLines: 0 }
  const headers = (json[0] as string[]).map(h => String(h ?? '').trim()).filter(Boolean)
  const dataLines = json.slice(1).filter(r => (r as string[]).some(v => String(v ?? '').trim() !== ''))
  const rows: ParsedRow[] = dataLines.slice(0, 5).map(line => {
    const row: ParsedRow = {}
    headers.forEach((h, j) => { row[h] = String((line as string[])[j] ?? '').trim() })
    return row
  })
  return { headers, rows, totalLines: dataLines.length }
}

export default function UploadPage() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload state
  const [dragging, setDragging]       = useState(false)
  const [file, setFile]               = useState<File | null>(null)
  const [preview, setPreview]         = useState<{ headers: string[]; rows: ParsedRow[]; totalLines: number } | null>(null)
  const [notes, setNotes]             = useState('')
  const [uploading, setUploading]     = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // History state
  const [requests, setRequests]       = useState<UploadRequest[] | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [expandedId, setExpandedId]   = useState<string | null>(null)

  // Load history on mount
  useState(() => {
    loadHistory()
  })

  async function loadHistory() {
    setLoadingHistory(true)
    const { data } = await supabase
      .from('data_upload_requests')
      .select('id, file_name, estimated_rows, status, user_notes, admin_notes, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    setRequests(data ?? [])
    setLoadingHistory(false)
  }

  const handleFile = useCallback(async (f: File) => {
    const isCSV   = /\.(csv|txt)$/i.test(f.name)
    const isExcel = /\.(xlsx|xls)$/i.test(f.name)
    if (!isCSV && !isExcel) {
      setError('Seuls les fichiers CSV et Excel (.xlsx, .xls) sont acceptés.')
      return
    }
    if (f.size > 20 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 20 Mo).')
      return
    }
    setError(null)
    setFile(f)
    try {
      if (isExcel) {
        const buf = await f.arrayBuffer()
        setPreview(parseExcelPreview(buf))
      } else {
        const text = await f.text()
        setPreview(parseCSVPreview(text))
      }
    } catch {
      setError('Impossible de lire ce fichier — vérifiez qu\'il n\'est pas corrompu.')
      setFile(null)
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  async function submit() {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')

      // 1. Upload to Supabase Storage
      const ext       = file.name.split('.').pop()
      const timestamp = Date.now()
      const filePath  = `${user.id}/${timestamp}_${file.name}`

      const { error: storageErr } = await supabase.storage
        .from('data-uploads')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })
      if (storageErr) throw new Error(`Upload échoué: ${storageErr.message}`)

      // 2. Create request record via API
      const res = await fetch('/api/upload/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name:      file.name,
          file_path:      filePath,
          file_size_bytes: file.size,
          estimated_rows: preview?.totalLines ?? null,
          user_notes:     notes.trim() || null,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Erreur serveur') }

      setSubmitted(true)
      setFile(null); setPreview(null); setNotes('')
      await loadHistory()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setUploading(false)
    }
  }

  function reset() {
    setFile(null); setPreview(null); setNotes(''); setError(null); setSubmitted(false)
  }

  return (
    <div className="max-w-[860px] mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-[26px] font-extrabold text-ink-1 mb-1" style={{ letterSpacing: '-0.8px' }}>
          Importer mes données CRM
        </h1>
        <p className="text-[14px] text-ink-3 leading-relaxed">
          Uploadez votre fichier CSV ou Excel. Notre équipe le traitera, mappera vos colonnes et injectera les données directement dans votre CRM sous 24–48h.
        </p>
      </div>

      {/* Upload card */}
      <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] overflow-hidden shadow-xs">

        {/* Success state */}
        {submitted ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-[20px] font-bold text-ink-1 mb-2">Demande envoyée ✓</h2>
            <p className="text-[14px] text-ink-3 mb-6 max-w-[380px] mx-auto">
              Votre fichier a été reçu. Notre équipe va le traiter et injecter les données dans votre CRM sous <strong>24–48h</strong>.
            </p>
            <button onClick={reset} className="btn-brand btn-md">Importer un autre fichier</button>
          </div>
        ) : (
          <div className="p-6 space-y-5">

            {/* Drop zone */}
            {!file ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200',
                  dragging
                    ? 'border-brand-400 bg-brand-50/60'
                    : 'border-[rgba(0,0,0,0.12)] hover:border-brand-300 hover:bg-surface-1'
                )}
              >
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors', dragging ? 'bg-brand-100' : 'bg-surface-2')}>
                  <Upload className={cn('w-6 h-6 transition-colors', dragging ? 'text-brand-600' : 'text-ink-4')} />
                </div>
                <p className="text-[15px] font-semibold text-ink-1 mb-1">
                  {dragging ? 'Déposez votre fichier ici' : 'Glissez votre fichier ou cliquez pour parcourir'}
                </p>
                <p className="text-[12px] text-ink-4">CSV ou Excel (.xlsx, .xls) · Max 20 Mo</p>
                <input ref={fileInputRef} type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </div>
            ) : (
              /* File selected — show preview */
              <div>
                {/* File info bar */}
                <div className="flex items-center gap-3 p-3.5 bg-brand-50 border border-brand-100 rounded-xl mb-4">
                  <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-ink-1 truncate">{file.name}</p>
                    <p className="text-[11px] text-ink-4">
                      {(file.size / 1024).toFixed(0)} Ko
                      {preview && preview.totalLines > 0 && ` · ~${preview.totalLines.toLocaleString('fr-MA')} lignes`}
                    </p>
                  </div>
                  <button onClick={() => { setFile(null); setPreview(null) }} className="text-ink-4 hover:text-ink-1 p-1 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Preview table */}
                {preview && preview.headers.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold text-ink-4 uppercase tracking-wide mb-2">Aperçu (5 premières lignes)</p>
                    <div className="overflow-x-auto rounded-xl border border-[rgba(0,0,0,0.07)]">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-surface-1 border-b border-[rgba(0,0,0,0.06)]">
                            {preview.headers.map(h => (
                              <th key={h} className="px-3 py-2 text-left font-semibold text-ink-3 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.map((row, i) => (
                            <tr key={i} className="border-b border-[rgba(0,0,0,0.04)] last:border-0">
                              {preview.headers.map(h => (
                                <td key={h} className="px-3 py-2 text-ink-3 whitespace-nowrap max-w-[160px] truncate">{row[h]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {file && (
              <div>
                <label className="block text-[12px] font-semibold text-ink-2 mb-2">
                  Description des colonnes <span className="text-ink-4 font-normal">(recommandé)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder={`Exemple :\nColonne A = Nom de l'entreprise\nColonne B = Téléphone (format 06xxxxxxxx)\nColonne C = Email contact\nColonne D = Ville\nColonne E = Statut (à contacter / intéressé / converti)`}
                  className="w-full border border-[rgba(0,0,0,0.1)] rounded-xl px-4 py-3 text-[13px] text-ink-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 placeholder:text-ink-5 transition-all"
                />
                <p className="text-[11px] text-ink-4 mt-1.5">Plus vous êtes précis, plus vite notre équipe pourra traiter votre import.</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-[13px] text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            {/* Submit */}
            {file && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-[12px] text-ink-4">Le fichier sera visible uniquement par notre équipe admin.</p>
                <button onClick={submit} disabled={uploading}
                  className="btn-brand btn-md min-w-[160px] justify-center">
                  {uploading
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Envoi en cours…</>
                    : <><Upload className="w-4 h-4 mr-2" />Envoyer la demande</>
                  }
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { n:'1', title:'Uploadez votre fichier',    body:'CSV ou Excel. Décrivez vos colonnes si les noms sont différents des nôtres.' },
          { n:'2', title:'On traite votre demande',  body:'Notre équipe mappe vos colonnes manuellement et vérifie la qualité des données sous 24–48h.' },
          { n:'3', title:'Vos données dans le CRM',  body:'Les leads apparaissent directement dans votre pipeline CRM, prêts à être traités.' },
        ].map(({ n, title, body }) => (
          <div key={n} className="bg-white rounded-xl border border-[rgba(0,0,0,0.07)] p-5">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center mb-3">
              <span className="text-[12px] font-bold text-white">{n}</span>
            </div>
            <p className="font-semibold text-ink-1 text-[13px] mb-1">{title}</p>
            <p className="text-[12px] text-ink-3 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      {/* Request history */}
      <div>
        <h2 className="text-[16px] font-bold text-ink-1 mb-4" style={{ letterSpacing: '-0.3px' }}>Mes demandes</h2>

        {loadingHistory ? (
          <div className="text-center py-10 text-ink-4"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : !requests || requests.length === 0 ? (
          <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.07)] p-8 text-center">
            <p className="text-[14px] text-ink-4">Aucune demande pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map(req => {
              const cfg = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
              const Icon = cfg.icon
              const isExpanded = expandedId === req.id
              return (
                <div key={req.id} className="bg-white rounded-xl border border-[rgba(0,0,0,0.07)] overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-surface-1 transition-colors"
                  >
                    <div className="w-8 h-8 bg-surface-2 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-ink-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-ink-1 truncate">{req.file_name}</p>
                      <p className="text-[11px] text-ink-4 mt-0.5">
                        {format(new Date(req.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                        {req.estimated_rows && ` · ${req.estimated_rows.toLocaleString('fr-MA')} lignes`}
                      </p>
                    </div>
                    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill border text-[11px] font-semibold', cfg.color)}>
                      <Icon className="w-3 h-3" />{cfg.label}
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-ink-4 shrink-0" /> : <ChevronDown className="w-4 h-4 text-ink-4 shrink-0" />}
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4 border-t border-[rgba(0,0,0,0.05)] pt-3 space-y-3">
                      {req.user_notes && (
                        <div>
                          <p className="text-[10px] font-bold text-ink-4 uppercase tracking-wide mb-1">Vos notes</p>
                          <p className="text-[13px] text-ink-2 whitespace-pre-wrap">{req.user_notes}</p>
                        </div>
                      )}
                      {req.admin_notes && (
                        <div className="bg-brand-50 border border-brand-100 rounded-lg p-3">
                          <p className="text-[10px] font-bold text-brand-700 uppercase tracking-wide mb-1">Message de l&apos;équipe</p>
                          <p className="text-[13px] text-brand-800 whitespace-pre-wrap">{req.admin_notes}</p>
                        </div>
                      )}
                      {req.status === 'completed' && (
                        <div className="flex items-center gap-2 text-[12px] text-emerald-600 font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Données injectées dans votre CRM
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
