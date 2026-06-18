'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Database, Search, Download, Trash2, Eye,
  Loader2, ChevronRight, Zap, Building2,
  Filter, Calendar, ArrowRight
} from 'lucide-react'
import { cn, formatDate, formatNumber } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import { FIELD_LABELS } from '@/lib/constants'

type Query = {
  id:               string
  filters:          Record<string, unknown>
  fields_requested: string[]
  result_count:     number
  credits_spent:    number
  created_at:       string
}

function FilterBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-pill bg-brand-50 border border-brand-100 text-[11px] font-semibold text-brand-700">
      {label}
    </span>
  )
}

function FieldPill({ field }: { field: string }) {
  const label = FIELD_LABELS[field] ?? field
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-pill bg-surface-2 border border-[rgba(0,0,0,0.07)] text-[10px] font-medium text-ink-3">
      {label}
    </span>
  )
}

function QueryRow({ query, onDelete }: { query: Query; onDelete: (id: string) => void }) {
  const toast   = useToast()
  const router  = useRouter()
  const [deleting, setDeleting] = useState(false)

  const f = query.filters ?? {}
  const sectors  = (f.sectors  as string[]) ?? (f.sector  ? [f.sector  as string] : [])
  const cities   = (f.cities   as string[]) ?? (f.city    ? [f.city    as string] : [])
  const regions  = (f.regions  as string[]) ?? []
  const effectif = (f.effectif as string[]) ?? []
  const name     = f.name as string | undefined

  const allTags = [...sectors, ...cities, ...regions, ...effectif, ...(name ? [name] : [])]

  const paidFields  = (query.fields_requested ?? []).filter(f => f !== 'name' && f !== 'sector' && f !== 'city' && f !== 'region')
  const costPerBiz  = query.result_count > 0 ? Math.round(query.credits_spent / query.result_count) : 0

  async function handleDelete() {
    if (!confirm('Supprimer cette recherche ?')) return
    setDeleting(true)
    try {
      const res = await fetch('/api/searches', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryId: query.id }),
      })
      if (!res.ok) { toast.error('Erreur'); return }
      toast.success('Recherche supprimée')
      onDelete(query.id)
    } finally { setDeleting(false) }
  }

  function handleView() {
    // Store a minimal result reference and navigate
    router.push(`/results?queryId=${query.id}`)
  }

  return (
    <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[16px] p-5 hover:border-[rgba(0,0,0,0.12)] hover:shadow-card-md transition-all group">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Left: info */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Date + metadata */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-[12px] text-ink-4">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(query.created_at)}
            </span>
            <span className="flex items-center gap-1 text-[12px] text-ink-2 font-semibold">
              <Building2 className="w-3.5 h-3.5 text-brand-500" />
              {formatNumber(query.result_count)} entreprise{query.result_count > 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1 text-[12px] text-amber-700 font-semibold">
              <Zap className="w-3.5 h-3.5 text-gold-500" />
              {query.credits_spent} cr dépensés
              {costPerBiz > 0 && <span className="text-ink-4 font-normal"> · {costPerBiz} cr/biz</span>}
            </span>
          </div>

          {/* Filter tags */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <Filter className="w-3 h-3 text-ink-5" />
              {allTags.slice(0, 6).map(tag => <FilterBadge key={tag} label={tag} />)}
              {allTags.length > 6 && <span className="text-[11px] text-ink-4">+{allTags.length - 6}</span>}
            </div>
          )}

          {/* Fields unlocked */}
          {paidFields.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-ink-4">Champs :</span>
              {paidFields.slice(0, 8).map(f => <FieldPill key={f} field={f} />)}
              {paidFields.length > 8 && <span className="text-[11px] text-ink-4">+{paidFields.length - 8}</span>}
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/api/export?queryId=${query.id}`}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-2 bg-surface-1 hover:bg-surface-2 border border-[rgba(0,0,0,0.08)] px-3 py-2 rounded-[9px] transition-colors"
            title="Exporter CSV">
            <Download className="w-3.5 h-3.5" /> CSV
          </a>
          <button onClick={handleView}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 px-3 py-2 rounded-[9px] transition-colors">
            <Eye className="w-3.5 h-3.5" /> Voir
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-1.5 text-[12px] text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-100 p-2 rounded-[9px] transition-all">
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DatabasesPage() {
  const [queries, setQueries]   = useState<Query[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [stats, setStats]       = useState({ total_credits: 0, total_results: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/searches?page=${page}`)
      const d   = await res.json()
      setQueries(d.queries ?? [])
      setTotal(d.total ?? 0)
      setStats({ total_credits: d.total_credits ?? 0, total_results: d.total_results ?? 0 })
    } finally { setLoading(false) }
  }, [page])

  useEffect(() => { load() }, [load])

  function removeQuery(id: string) {
    setQueries(q => q.filter(x => x.id !== id))
    setTotal(t => t - 1)
  }

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto animate-reveal-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-bold text-ink-1" style={{ fontSize: '26px', letterSpacing: '-0.8px' }}>
            Mes recherches
          </h1>
          <p className="text-[14px] text-ink-3 mt-1">
            Retrouvez, re-visualisez et exportez toutes vos recherches passées.
          </p>
        </div>
        <Link href="/search"
          className="btn-brand flex items-center gap-2 text-sm">
          <Search className="w-4 h-4" /> Nouvelle recherche
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Recherches total',     val: total,                   icon: Database,   color: 'text-brand-600 bg-brand-50' },
          { label: 'Entreprises trouvées', val: stats.total_results,    icon: Building2,  color: 'text-violet-600 bg-violet-50' },
          { label: 'Crédits dépensés',    val: stats.total_credits,    icon: Zap,        color: 'text-gold-600 bg-gold-50' },
        ].map(({ label, val, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[16px] p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] text-ink-3">{label}</p>
              <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="font-bold text-ink-1 tabular-nums"
              style={{ fontSize: '28px', letterSpacing: '-1px', lineHeight: 1 }}>
              {formatNumber(val)}
            </p>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-white rounded-[16px] border border-[rgba(0,0,0,0.07)] animate-pulse" />)}
        </div>
      ) : queries.length === 0 ? (
        <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[20px] p-20 text-center shadow-card">
          <Database className="w-12 h-12 text-ink-5 mx-auto mb-4" />
          <p className="font-bold text-ink-1 text-[16px] mb-2">Aucune recherche pour l&apos;instant</p>
          <p className="text-[14px] text-ink-3 mb-6">
            Lancez votre première recherche pour trouver des prospects B2B au Maroc.
          </p>
          <Link href="/search" className="btn-brand inline-flex items-center gap-2">
            <Search className="w-4 h-4" /> Lancer une recherche <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {queries.map(q => (
            <QueryRow key={q.id} query={q} onDelete={removeQuery} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-[13px] text-ink-3">Page {page} / {Math.ceil(total / 20)}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="btn-ghost btn-sm disabled:opacity-40">← Précédent</button>
            <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}
              className="btn-ghost btn-sm disabled:opacity-40">Suivant →</button>
          </div>
        </div>
      )}
    </div>
  )
}
