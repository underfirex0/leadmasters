'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp, Users, CreditCard, AlertCircle,
  ArrowRight, Clock, CheckCircle, Database, Zap
} from 'lucide-react'
import { formatDate, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'

const PLAN_BADGE: Record<string, string> = {
  decouverte: 'bg-surface-2 text-ink-3',
  solo:       'bg-brand-50 text-brand-700',
  equipe:     'bg-violet-50 text-violet-700',
  business:   'bg-gold-50 text-gold-700',
  entreprise: 'bg-emerald-50 text-emerald-700',
}
const PLAN_LABEL: Record<string, string> = {
  decouverte:'Découverte', solo:'Solo', equipe:'Équipe', business:'Business', entreprise:'Entreprise',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-surface-2 rounded-lg" />
      {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-[18px] border border-[rgba(0,0,0,0.07)]" />)}
    </div>
  )

  if (!stats) return <div className="text-red-500 p-4">Erreur de chargement des stats.</div>

  const planDist    = (stats.plan_distribution as Record<string, number>) ?? {}
  const recentUsers = (stats.recent_users as Record<string, unknown>[]) ?? []
  const pending     = stats.pending_count as number ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-bold text-ink-1" style={{ fontSize: '26px', letterSpacing: '-0.8px' }}>
            Tableau de bord
          </h1>
          <p className="text-[14px] text-ink-3 mt-1">Vue d&apos;ensemble de la plateforme</p>
        </div>
        {pending > 0 && (
          <Link href="/admin/subscriptions?status=pending"
            className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-[12px] px-4 py-2.5 text-[13px] font-semibold hover:bg-red-100 transition-colors animate-pulse-dot">
            <AlertCircle className="w-4 h-4" />
            {pending} activation{pending > 1 ? 's' : ''} en attente
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'MRR', val: `${formatNumber(stats.mrr as number)} MAD`, sub: 'Revenus mensuels récurrents', icon: TrendingUp, color: 'text-brand-600 bg-brand-50', link: '/admin/subscriptions' },
          { label: 'ARR estimé', val: `${formatNumber(stats.arr as number)} MAD`, sub: '× 12 mois', icon: TrendingUp, color: 'text-violet-600 bg-violet-50', link: '/admin/subscriptions' },
          { label: 'Utilisateurs', val: formatNumber(stats.total_users as number), sub: `${stats.active_subs} abonnés actifs`, icon: Users, color: 'text-emerald-600 bg-emerald-50', link: '/admin/users' },
          { label: 'Revenus TTC', val: `${formatNumber(stats.total_revenue as number)} MAD`, sub: `${formatNumber(stats.pending_amount as number)} MAD en attente`, icon: CreditCard, color: 'text-gold-600 bg-gold-50', link: '/admin/invoices' },
        ].map(({ label, val, sub, icon: Icon, color, link }) => (
          <Link key={label} href={link}
            className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] p-5 shadow-card hover:shadow-card-md hover:-translate-y-0.5 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[12px] font-medium text-ink-3">{label}</p>
              <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="font-bold text-ink-1 tabular-nums mb-0.5"
              style={{ fontSize: '22px', letterSpacing: '-0.8px', lineHeight: 1 }}>{val}</p>
            <p className="text-[11px] text-ink-4">{sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Plan distribution */}
        <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.05)] flex items-center justify-between">
            <p className="font-bold text-[14px] text-ink-1">Plans actifs</p>
            <Link href="/admin/users" className="text-[12px] text-brand-600 hover:underline">Voir →</Link>
          </div>
          <div className="p-5 space-y-3">
            {['decouverte','solo','equipe','business','entreprise'].map(pid => {
              const count = planDist[pid] ?? 0
              const total = (stats.total_users as number) || 1
              const pct   = Math.round((count / total) * 100)
              const prices: Record<string, number> = { solo:149, equipe:390, business:990 }
              const rev = (prices[pid] ?? 0) * count
              return (
                <div key={pid}>
                  <div className="flex items-center justify-between text-[13px] mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-pill', PLAN_BADGE[pid])}>
                        {PLAN_LABEL[pid]}
                      </span>
                      <span className="font-semibold text-ink-1">{count}</span>
                    </div>
                    <div className="text-right text-[11px]">
                      <span className="text-ink-4">{pct}%</span>
                      {rev > 0 && <span className="text-ink-3 ml-2">{formatNumber(rev)} MAD</span>}
                    </div>
                  </div>
                  <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all',
                      pid==='solo'?'bg-brand-500': pid==='equipe'?'bg-violet-500': pid==='business'?'bg-gold-500': pid==='entreprise'?'bg-emerald-500':'bg-ink-5'
                    )} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.05)] flex items-center justify-between">
            <p className="font-bold text-[14px] text-ink-1">Revenus</p>
            <Link href="/admin/invoices" className="text-[12px] text-brand-600 hover:underline">Factures →</Link>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: 'Abonnements payés',  val: stats.sub_revenue as number,     dot: 'bg-brand-500' },
              { label: 'Top-ups payés',      val: stats.topup_revenue as number,   dot: 'bg-gold-500' },
              { label: 'En attente',         val: stats.pending_amount as number,  dot: 'bg-amber-400' },
            ].map(({ label, val, dot }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-[rgba(0,0,0,0.04)] last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                  <span className="text-[13px] text-ink-2">{label}</span>
                </div>
                <span className="font-bold text-[14px] text-ink-1 tabular-nums">{formatNumber(val)} MAD</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[13px] font-bold text-ink-1">Total TTC perçu</span>
              <span className="font-bold text-[16px] text-brand-700 tabular-nums">{formatNumber(stats.total_revenue as number)} MAD</span>
            </div>
          </div>
        </div>

        {/* Recent signups */}
        <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.05)] flex items-center justify-between">
            <p className="font-bold text-[14px] text-ink-1">Inscriptions récentes</p>
            <Link href="/admin/users" className="text-[12px] text-brand-600 hover:underline">Tous →</Link>
          </div>
          <div className="divide-y divide-[rgba(0,0,0,0.04)]">
            {recentUsers.slice(0, 7).map(u => (
              <Link key={u.id as string} href={`/admin/users?search=${u.email}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-surface-1/60 transition-colors">
                <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-brand-700 font-bold text-[11px]">
                    {((u.full_name as string || u.email as string || 'U')[0]).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-ink-1 truncate">{(u.full_name as string) || (u.email as string)}</p>
                  <p className="text-[10px] text-ink-4">{formatDate(u.created_at as string)}</p>
                </div>
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-pill', PLAN_BADGE[(u.plan_id as string) ?? 'decouverte'])}>
                  {PLAN_LABEL[(u.plan_id as string) ?? 'decouverte']}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/admin/subscriptions?status=pending', label: 'Activer abonnements', sub: `${pending} en attente`, icon: CheckCircle, color: pending > 0 ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'bg-white hover:bg-surface-1 border-[rgba(0,0,0,0.07)]' },
          { href: '/admin/invoices?status=pending',      label: 'Factures impayées', sub: `${formatNumber(stats.pending_amount as number)} MAD`, icon: Clock, color: 'bg-white hover:bg-surface-1 border-[rgba(0,0,0,0.07)]' },
          { href: '/admin/users',                        label: 'Gérer utilisateurs', sub: `${stats.total_users} comptes`, icon: Users, color: 'bg-white hover:bg-surface-1 border-[rgba(0,0,0,0.07)]' },
          { href: '/admin/data',                         label: 'Base de données', sub: 'Entreprises & import', icon: Database, color: 'bg-white hover:bg-surface-1 border-[rgba(0,0,0,0.07)]' },
        ].map(({ href, label, sub, icon: Icon, color }) => (
          <Link key={href} href={href}
            className={cn('flex items-start gap-3 p-4 rounded-[14px] border transition-all group', color)}>
            <Icon className="w-5 h-5 text-ink-3 group-hover:text-ink-1 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-[13px] text-ink-1">{label}</p>
              <p className="text-[11px] text-ink-4 mt-0.5">{sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
