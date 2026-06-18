'use client'
import { useState, useEffect } from 'react'
import { Zap, Search, Users, TrendingUp, Loader2 } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

type AnalyticsData = {
  credit_stats:  { total_granted: number; total_spent: number }
  query_stats:   { total: number }
  unlock_stats:  { total: number; by_field: Record<string, number> }
  top_users:     { id: string; email: string; full_name: string | null; plan_id: string; credit_balance: number; query_count: number; credits_spent: number }[]
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(true)
        else setData(d)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
    </div>
  )
  if (error || !data) return (
    <div className="text-[14px] text-red-500 p-4 bg-red-50 rounded-[12px] border border-red-200">
      Erreur de chargement des analytics.
    </div>
  )

  const { credit_stats, query_stats, unlock_stats, top_users } = data
  const byField = unlock_stats.by_field ?? {}

  const FIELD_NAMES: Record<string, string> = {
    phone: 'Téléphone', email: 'E-mail', website: 'Site web', address: 'Adresse',
    effectif_label: 'Effectif', dirigeant_name: 'Nom dirigeant', annee_creation: 'Année création',
    dirigeant_phone: 'Tél. dirigeant', dirigeant_email: 'E-mail dirigeant',
    revenue_label: 'Chiffre d\'affaires', capital_social: 'Capital social',
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-bold text-ink-1" style={{ fontSize: '26px', letterSpacing: '-0.8px' }}>Analytics</h1>
        <p className="text-[14px] text-ink-3 mt-1">Utilisation de la plateforme et performance.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Crédits distribués',   val: formatNumber(credit_stats.total_granted),  sub: 'tous les temps',    icon: Zap,       color: 'text-gold-600 bg-gold-50' },
          { label: 'Crédits consommés',    val: formatNumber(credit_stats.total_spent),   sub: 'tous les temps',    icon: TrendingUp, color: 'text-red-500 bg-red-50' },
          { label: 'Recherches lancées',   val: formatNumber(query_stats.total),          sub: 'total',             icon: Search,    color: 'text-brand-600 bg-brand-50' },
          { label: 'Champs déverrouillés', val: formatNumber(unlock_stats.total),         sub: 'événements unlock', icon: Users,     color: 'text-violet-600 bg-violet-50' },
        ].map(({ label, val, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[16px] p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] text-ink-3">{label}</p>
              <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="font-bold text-ink-1 tabular-nums" style={{ fontSize: '24px', letterSpacing: '-0.8px', lineHeight: 1 }}>{val}</p>
            <p className="text-[11px] text-ink-4 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Top users */}
      <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.05)]">
          <p className="font-bold text-[14px] text-ink-1">Top utilisateurs — consommation crédits</p>
        </div>
        {top_users.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-ink-3">Pas encore de données.</div>
        ) : (
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>#</th><th>Utilisateur</th><th>Plan</th>
                <th>Solde</th><th>Recherches</th><th>Crédits dépensés</th>
              </tr>
            </thead>
            <tbody>
              {top_users.map((u, i) => (
                <tr key={u.id}>
                  <td className="text-[13px] font-bold text-ink-4 w-8">{i + 1}</td>
                  <td>
                    <p className="font-semibold text-[13px]">{u.full_name || '—'}</p>
                    <p className="text-[11px] text-ink-4">{u.email}</p>
                  </td>
                  <td><span className="text-[11px] font-semibold text-ink-2 bg-surface-1 px-2 py-0.5 rounded-pill capitalize">{u.plan_id}</span></td>
                  <td className="font-bold text-[13px] text-brand-700 tabular-nums">{formatNumber(u.credit_balance)} cr</td>
                  <td className="text-[13px] text-ink-2 tabular-nums">{formatNumber(u.query_count)}</td>
                  <td className="font-bold text-[13px] text-ink-1 tabular-nums">{formatNumber(u.credits_spent)} cr</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Field unlock breakdown */}
      {Object.keys(byField).length > 0 && (
        <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] p-6 shadow-card">
          <p className="font-bold text-[14px] text-ink-1 mb-5">Champs les plus déverrouillés</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(byField).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([field, count]) => (
              <div key={field} className="bg-surface-1 rounded-[12px] p-3.5 text-center">
                <p className="font-bold text-[20px] tabular-nums text-ink-1" style={{ letterSpacing: '-0.5px' }}>{formatNumber(count)}</p>
                <p className="text-[11px] text-ink-3 mt-0.5">{FIELD_NAMES[field] ?? field}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
