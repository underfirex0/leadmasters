import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Search, Wallet, TrendingUp, Clock, ChevronRight, Building2, Crown, ArrowRight, Sparkles } from 'lucide-react'
import { formatDate, formatNumber } from '@/lib/utils'
import type { Query } from '@/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: queries }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('queries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
  ])

  const totalCreditsSpent = queries?.reduce((s, q) => s + (q.credits_spent ?? 0), 0) ?? 0

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto animate-reveal-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <div>
          <h1 className="font-bold text-ink-1" style={{ fontSize: '26px', letterSpacing: '-0.8px' }}>
            Bonjour{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-[14px] text-ink-3 mt-1">Voici un aperçu de votre activité.</p>
        </div>
        <Link href="/search" className="btn-brand self-start">
          <Search className="w-4 h-4" /> Nouvelle recherche
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Solde crédits', value: formatNumber(profile?.credit_balance ?? 0), sub: 'crédits disponibles', icon: '◆', accent: 'text-gold-600', bg: 'bg-gold-50 border-gold-100', link: '/wallet' },
          { label: 'Recherches',    value: (queries?.length ?? 0).toString(),             sub: 'requêtes effectuées', icon: Search,  accent: 'text-brand-600', bg: 'bg-brand-50 border-brand-100', link: null },
          { label: 'Crédits dépensés', value: formatNumber(totalCreditsSpent),           sub: 'total utilisés',     icon: TrendingUp, accent: 'text-violet-600', bg: 'bg-violet-50 border-violet-100', link: null },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] p-6 shadow-card hover:shadow-card-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-medium text-ink-3">{stat.label}</span>
              <div className={`w-8 h-8 rounded-[8px] border flex items-center justify-center ${stat.bg}`}>
                {typeof stat.icon === 'string'
                  ? <span className={`text-[11px] font-bold ${stat.accent}`}>{stat.icon}</span>
                  : <stat.icon className={`w-4 h-4 ${stat.accent}`} />
                }
              </div>
            </div>
            <p className="font-bold text-ink-1 mb-0.5 tabular-nums" style={{ fontSize: '32px', letterSpacing: '-1.5px', lineHeight: 1 }}>
              {stat.value}
            </p>
            <p className="text-[12px] text-ink-4 mt-1">{stat.sub}</p>
            {stat.link && (
              <Link href={stat.link} className="text-[12px] text-brand-600 font-medium mt-2 flex items-center gap-1 hover:gap-1.5 transition-all">
                Voir les transactions <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent queries */}
        <div className="lg:col-span-2 bg-white border border-[rgba(0,0,0,0.07)] rounded-[18px] shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.05)] flex items-center gap-2">
            <Clock className="w-4 h-4 text-ink-4" />
            <span className="font-semibold text-[14px] text-ink-1">Recherches récentes</span>
          </div>
          {!queries?.length ? (
            <div className="px-6 py-14 text-center">
              <Building2 className="w-8 h-8 text-ink-5 mx-auto mb-3" />
              <p className="text-[13px] text-ink-3 mb-4">Aucune recherche pour l&apos;instant.</p>
              <Link href="/search" className="btn-brand text-sm">Lancer ma première recherche</Link>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(0,0,0,0.04)]">
              {(queries as Query[]).map(q => (
                <div key={q.id} className="px-6 py-4 flex items-center justify-between hover:bg-surface-1/60 transition-colors group">
                  <div>
                    <p className="text-[13px] font-semibold text-ink-1">
                      {q.filters?.sector || 'Tous secteurs'}
                      {q.filters?.city ? ` · ${q.filters.city}` : ''}
                    </p>
                    <p className="text-[11px] text-ink-4 mt-0.5">{formatDate(q.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-ink-3">{q.result_count} résultats</span>
                    <span className="badge badge-gold text-[11px]">{q.credits_spent} cr</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          {[
            { href: '/search', icon: Search,  title: 'Nouvelle recherche',     sub: 'Filtrer et débloquer',     accent: 'bg-brand-50 text-brand-600',   hover: 'hover:border-brand-200 hover:bg-brand-50/30' },
            { href: '/meetmaster', icon: Crown, title: 'MeetMaster',           sub: 'Rencontrer des décideurs', accent: 'bg-gold-50 text-gold-600',     hover: 'hover:border-gold-200 hover:bg-gold-50/30' },
            { href: '/wallet',  icon: Wallet, title: `${formatNumber(profile?.credit_balance ?? 0)} crédits`, sub: 'Voir mes transactions', accent: 'bg-emerald-50 text-emerald-600', hover: 'hover:border-emerald-200 hover:bg-emerald-50/30' },
          ].map(({ href, icon: Icon, title, sub, accent, hover }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-4 p-4 bg-white border border-[rgba(0,0,0,0.07)] rounded-[14px] shadow-card ${hover} transition-all group`}>
              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${accent}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13px] text-ink-1">{title}</p>
                <p className="text-[12px] text-ink-3">{sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-4 group-hover:text-ink-1 transition-colors" />
            </Link>
          ))}

          {/* Low credits alert */}
          {(profile?.credit_balance ?? 0) < 20 && (
            <div className="bg-amber-50 border border-amber-100 rounded-[14px] p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-[13px] text-amber-900 mb-0.5">Crédits faibles</p>
                  <p className="text-[12px] text-amber-700">Rechargez votre compte pour continuer.</p>
                  <Link href="/wallet" className="text-[12px] font-semibold text-amber-700 hover:text-amber-900 mt-1 flex items-center gap-1">
                    Recharger <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
