'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, Database, Mail, Phone, User, Building2, Loader2, CheckCircle, X } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'

type Stats = { total: number; withEmail: number; withPhone: number; withDirigent: number; topSectors: [string,number][]; topCities: [string,number][] }
type Business = { id: string; name: string; sector: string; city: string; phone: string | null; email: string | null; dirigeant_name: string | null; effectif_label: string | null; revenue_label: string | null; created_at: string }

function StatCard({ label, value, total, icon: Icon, color }: { label: string; value: number; total: number; icon: React.ElementType; color: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[16px] p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] text-ink-3">{label}</p>
        <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="font-bold text-ink-1 tabular-nums mb-1" style={{ fontSize: '28px', letterSpacing: '-1px', lineHeight: 1 }}>
        {formatNumber(value)}
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] text-ink-4">{pct}%</span>
      </div>
    </div>
  )
}

export default function AdminDataPage() {
  const [stats, setStats]       = useState<Stats | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [loadingTable, setLoadingTable] = useState(false)
  const [selected, setSelected] = useState<Business | null>(null)

  useEffect(() => {
    fetch('/api/admin/businesses?stats=1').then(r => r.json()).then(setStats)
  }, [])

  const loadTable = useCallback(async () => {
    setLoadingTable(true)
    try {
      const params = new URLSearchParams({ page: page.toString() })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/businesses?${params}`)
      const d = await res.json()
      setBusinesses(d.businesses ?? [])
      setTotal(d.total ?? 0)
    } finally { setLoadingTable(false); setLoading(false) }
  }, [page, search])

  useEffect(() => { loadTable() }, [loadTable])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-ink-1" style={{ fontSize: '26px', letterSpacing: '-0.8px' }}>Base de données</h1>
        <p className="text-[14px] text-ink-3 mt-1">Gérez les entreprises marocaines dans le système.</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total entreprises"  value={stats.total ?? 0}        total={stats.total ?? 0}     icon={Building2} color="text-brand-600 bg-brand-50" />
          <StatCard label="Avec e-mail"         value={stats.withEmail ?? 0}   total={stats.total ?? 0}     icon={Mail}      color="text-emerald-600 bg-emerald-50" />
          <StatCard label="Avec téléphone"      value={stats.withPhone ?? 0}   total={stats.total ?? 0}     icon={Phone}     color="text-blue-600 bg-blue-50" />
          <StatCard label="Avec dirigeant"      value={stats.withDirigent ?? 0} total={stats.total ?? 0}    icon={User}      color="text-violet-600 bg-violet-50" />
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-6">
          {/* Top sectors */}
          <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] p-5 shadow-card">
            <p className="font-bold text-[14px] text-ink-1 mb-4">Top secteurs</p>
            <div className="space-y-2.5">
              {(stats.topSectors ?? []).slice(0, 8).map(([sector, count]) => {
                const pct = stats.total ? Math.round((count / stats.total) * 100) : 0
                return (
                  <div key={sector}>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-ink-2 truncate max-w-[180px]">{sector}</span>
                      <span className="font-semibold text-ink-1 shrink-0 ml-2">{count}</span>
                    </div>
                    <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top cities */}
          <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] p-5 shadow-card">
            <p className="font-bold text-[14px] text-ink-1 mb-4">Top villes</p>
            <div className="space-y-2.5">
              {(stats.topCities ?? []).slice(0, 8).map(([city, count]) => {
                const pct = stats.total ? Math.round((count / stats.total) * 100) : 0
                return (
                  <div key={city}>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-ink-2">{city}</span>
                      <span className="font-semibold text-ink-1">{count}</span>
                    </div>
                    <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Import hint */}
      <div className="bg-brand-50 border border-brand-100 rounded-[16px] p-5 flex items-start gap-4">
        <Database className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-[14px] text-brand-900 mb-1">Importer des données</p>
          <p className="text-[13px] text-brand-700">
            Pour importer le fichier <strong>LeadScout_Base_Entreprises.xlsx</strong>, allez dans Supabase →
            Table Editor → businesses → Import CSV. Assurez-vous d&apos;abord d&apos;avoir exécuté le script
            <code className="bg-brand-100 px-1.5 py-0.5 rounded text-[12px] mx-1">add_directions_columns.sql</code>
            pour ajouter les colonnes directions.
          </p>
        </div>
      </div>

      {/* Search + Table */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4" />
          <input type="text" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher par nom d'entreprise…"
            className="input pl-10 bg-white text-sm max-w-md" />
        </div>

        <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] shadow-card overflow-hidden">
          {loading || loadingTable ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
          ) : (
            <>
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Entreprise</th>
                    <th>Secteur</th>
                    <th>Ville</th>
                    <th>Téléphone</th>
                    <th>E-mail</th>
                    <th>Dirigeant</th>
                    <th>Effectif</th>
                    <th>CA</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.map(b => (
                    <tr key={b.id} className="cursor-pointer" onClick={() => setSelected(b)}>
                      <td className="font-semibold text-[13px] text-ink-1 max-w-[160px] truncate">{b.name}</td>
                      <td className="text-[12px] text-ink-3 max-w-[120px] truncate">{b.sector || '—'}</td>
                      <td className="text-[12px] text-ink-2">{b.city || '—'}</td>
                      <td className="text-[12px] font-mono">{b.phone ? <span className="text-brand-600">{b.phone}</span> : <span className="text-ink-5">—</span>}</td>
                      <td className="text-[12px] truncate max-w-[140px]">{b.email ? <span className="text-brand-600">{b.email}</span> : <span className="text-ink-5">—</span>}</td>
                      <td className="text-[12px] text-ink-2">{b.dirigeant_name || '—'}</td>
                      <td className="text-[12px] text-ink-3">{b.effectif_label || '—'}</td>
                      <td className="text-[12px] text-ink-3">{b.revenue_label || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {total > 25 && (
                <div className="px-6 py-4 border-t border-[rgba(0,0,0,0.05)] flex items-center justify-between">
                  <p className="text-[12px] text-ink-3">{formatNumber(total)} entreprises · Page {page}/{Math.ceil(total/25)}</p>
                  <div className="flex gap-2">
                    <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="btn-ghost btn-sm disabled:opacity-40">←</button>
                    <button disabled={page*25>=total} onClick={() => setPage(p=>p+1)} className="btn-ghost btn-sm disabled:opacity-40">→</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Business detail drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-[20px] w-full max-w-lg shadow-card-lg animate-scale-in max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-[16px] text-ink-1">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full hover:bg-surface-2 flex items-center justify-center">
                <X className="w-4 h-4 text-ink-3" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3 text-[13px]">
              {[
                ['Secteur',    selected.sector],
                ['Ville',      selected.city],
                ['Téléphone',  selected.phone],
                ['E-mail',     selected.email],
                ['Site web',   null],
                ['Effectif',   selected.effectif_label],
                ['CA',         selected.revenue_label],
                ['Dirigeant',  selected.dirigeant_name],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label as string} className="flex items-start justify-between gap-4 py-2 border-b border-[rgba(0,0,0,0.04)] last:border-0">
                  <span className="text-ink-3 shrink-0 w-24">{label}</span>
                  <span className="font-medium text-ink-1 text-right break-all">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
