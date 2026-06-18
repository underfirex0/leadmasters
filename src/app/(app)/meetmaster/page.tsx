'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Crown, Star, MapPin, Search, ChevronRight,
  CheckCircle, Calendar, Sparkles, ArrowRight,
  Users, Zap, Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Master } from '@/types'

// ── Role config ───────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { gradient: string; badge: string; seed: string }> = {
  'DRH':                    { gradient: 'from-rose-400 to-pink-500',      badge: 'bg-rose-50 text-rose-700 border-rose-100',      seed: 'rose' },
  'Directrice des RH':      { gradient: 'from-rose-400 to-pink-500',      badge: 'bg-rose-50 text-rose-700 border-rose-100',      seed: 'pink' },
  'DAF':                    { gradient: 'from-blue-500 to-indigo-600',     badge: 'bg-blue-50 text-blue-700 border-blue-100',      seed: 'blue' },
  'DG / CEO':               { gradient: 'from-amber-400 to-orange-500',   badge: 'bg-amber-50 text-amber-700 border-amber-100',   seed: 'amber' },
  'Directeur des Achats':   { gradient: 'from-emerald-500 to-teal-600',   badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', seed: 'green' },
  'Directrice des Achats':  { gradient: 'from-emerald-500 to-teal-600',   badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', seed: 'teal' },
  'DSI':                    { gradient: 'from-violet-500 to-purple-600',   badge: 'bg-violet-50 text-violet-700 border-violet-100', seed: 'violet' },
  'Directeur Commercial':   { gradient: 'from-cyan-500 to-sky-600',       badge: 'bg-cyan-50 text-cyan-700 border-cyan-100',      seed: 'cyan' },
  'Directeur Marketing':    { gradient: 'from-fuchsia-500 to-pink-600',   badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100', seed: 'fuchsia' },
}

const DEFAULT_ROLE = { gradient: 'from-slate-500 to-slate-700', badge: 'bg-slate-50 text-slate-700 border-slate-100', seed: 'default' }

const AVATAR_BG: Record<string, string> = {
  rose: 'fecdd3', pink: 'fbcfe8', blue: 'bfdbfe', amber: 'fde68a',
  green: 'bbf7d0', teal: 'a7f3d0', violet: 'ddd6fe', cyan: 'a5f3fc',
  fuchsia: 'f5d0fe', default: 'e2e8f0',
}

function getAvatarUrl(displayName: string, role: string, avatarUrl?: string | null): string {
  if (avatarUrl) return avatarUrl
  const cfg = ROLE_CONFIG[role] ?? DEFAULT_ROLE
  const bg  = AVATAR_BG[cfg.seed] ?? 'e2e8f0'
  const seed = encodeURIComponent(displayName.replace(/\s/g, '').replace('.', ''))
  return `https://api.dicebear.com/9.x/micah/svg?seed=${seed}&backgroundColor=${bg}`
}

const ROLE_FILTERS = [
  'DRH', 'DAF', 'DG / CEO', 'Directeur des Achats',
  'Directrice des Achats', 'DSI', 'Directeur Commercial',
]

// ── Master Card ───────────────────────────────────────────────
function MasterCard({ master, index }: { master: Master; index: number }) {
  const cfg        = ROLE_CONFIG[master.role] ?? DEFAULT_ROLE
  const avatarUrl  = getAvatarUrl(master.display_name, master.role, (master as unknown as Record<string, string>).avatar_url ?? null)

  return (
    <Link href={`/meetmaster/${master.id}`}
      className="group bg-white rounded-2xl border border-slate-100 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col animate-fade-in"
      style={{ animationDelay: `${index * 60}ms` }}>

      {/* Top accent line */}
      <div className={`h-0.5 w-full bg-gradient-to-r ${cfg.gradient}`} />

      <div className="p-5 flex gap-4 flex-1">
        {/* Avatar column */}
        <div className="shrink-0 flex flex-col items-center gap-2">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-white shadow-md">
              <img
                src={avatarUrl}
                alt={master.display_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const initials = master.display_name.split(' ').map(w => w[0]).join('').slice(0, 2)
                  e.currentTarget.style.display = 'none'
                  const parent = e.currentTarget.parentElement!
                  parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white font-bold text-lg">${initials}</div>`
                }}
              />
            </div>
            {master.is_verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                <CheckCircle className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>

          {/* Rating */}
          {master.average_rating && (
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-slate-700">{master.average_rating}</span>
            </div>
          )}
        </div>

        {/* Info column */}
        <div className="flex-1 min-w-0">
          {/* Name + role */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-slate-900 text-base leading-tight truncate" style={{ fontFamily: 'Syne,sans-serif' }}>
              {master.display_name}
            </h3>
          </div>

          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', cfg.badge)}>
              {master.role}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 mb-3 flex-wrap">
            {master.company_sector && <span>{master.company_sector}</span>}
            {master.city && (
              <span className="flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />{master.city}
              </span>
            )}
            {master.meetings_completed > 0 && (
              <span className="text-slate-300">·</span>
            )}
            {master.meetings_completed > 0 && (
              <span>{master.meetings_completed} meetings</span>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {master.expertise.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
            {master.expertise.length > 3 && (
              <span className="text-[10px] font-medium text-slate-400 px-1">
                +{master.expertise.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-slate-50 flex items-center justify-between bg-slate-50/50">
        <div>
          <p className="text-xs text-slate-400">{master.max_meetings_per_month} sessions/mois</p>
          <p className="font-bold text-slate-900 text-sm">
            1 000 MAD <span className="text-xs text-slate-400 font-normal">/ 30 min</span>
          </p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-amber-50 group-hover:bg-amber-400 flex items-center justify-center transition-all duration-200">
          <ChevronRight className="w-4 h-4 text-amber-500 group-hover:text-white transition-colors" />
        </div>
      </div>
    </Link>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function MeetMasterPage() {
  const [masters, setMasters]       = useState<Master[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')

  useEffect(() => {
    fetch('/api/meetmaster/masters')
      .then(r => r.json())
      .then(d => {
        // Deduplicate by display_name (in case seed ran twice)
        const seen = new Set<string>()
        const unique = (d.masters ?? []).filter((m: Master) => {
          if (seen.has(m.display_name)) return false
          seen.add(m.display_name)
          return true
        })
        setMasters(unique)
      })
      .finally(() => setLoading(false))
  }, [])

  const cities = useMemo(() => [...new Set(masters.map(m => m.city).filter(Boolean))].sort() as string[], [masters])

  const filtered = useMemo(() => masters.filter(m => {
    if (roleFilter && m.role !== roleFilter) return false
    if (cityFilter && m.city !== cityFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        m.display_name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.expertise.some(e => e.toLowerCase().includes(q)) ||
        (m.company_sector?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  }), [masters, search, roleFilter, cityFilter])

  return (
    <div className="space-y-10 animate-fade-in">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 py-12 md:px-12">
        {/* Background effects */}
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-amber-400/15 border border-amber-400/25 rounded-full px-4 py-1.5 text-sm font-semibold text-amber-300 mb-5">
              <Crown className="w-4 h-4" />
              MeetMaster by LeadScout
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-3" style={{ fontFamily: 'Syne,sans-serif' }}>
              Rencontrez les décideurs qui<br className="hidden md:block" />
              <span className="text-amber-400"> transforment votre business.</span>
            </h1>
            <p className="text-white/50 leading-relaxed">
              30 minutes avec un DRH, DAF ou Directeur Achats de top entreprise.
              Benchmark de marché, insights exclusifs, réseau direct. 1 000 MAD le meeting.
            </p>

            {/* Trust row */}
            <div className="flex items-center gap-6 mt-6 flex-wrap">
              {[
                { icon: Users,   text: `${masters.length} Masters actifs` },
                { icon: Clock,   text: '30 min · Visio' },
                { icon: Zap,     text: 'Réponse sous 24h' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-sm text-white/50">
                  <Icon className="w-3.5 h-3.5 text-amber-400/70" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right side */}
          <div className="flex flex-col gap-3 shrink-0">
            <div className="bg-white/8 backdrop-blur border border-white/10 rounded-2xl p-5 text-center min-w-36">
              <p className="text-4xl font-bold text-white" style={{ fontFamily: 'Syne,sans-serif' }}>
                {masters.length}
              </p>
              <p className="text-white/40 text-xs mt-1">Masters disponibles</p>
            </div>
            <Link href="/meetmaster/apply"
              className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold px-5 py-3 rounded-xl text-sm text-center hover:shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
              Devenir Master
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { n: '01', icon: Search,   title: 'Choisissez',   desc: 'Filtrez par rôle, secteur et ville', color: 'text-indigo-500 bg-indigo-50' },
          { n: '02', icon: Calendar, title: 'Proposez',     desc: '3 créneaux · Réponse sous 24h',      color: 'text-amber-500 bg-amber-50' },
          { n: '03', icon: Sparkles, title: 'Rencontrez',   desc: '30 min de valeur pure en visio',      color: 'text-emerald-500 bg-emerald-50' },
        ].map(({ n, icon: Icon, title, desc, color }) => (
          <div key={n} className="bg-white rounded-2xl border border-slate-100 p-5 text-center">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="font-bold text-slate-900 text-sm mb-0.5" style={{ fontFamily: 'Syne,sans-serif' }}>{title}</p>
            <p className="text-xs text-slate-400">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="space-y-3">
        {/* Role pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setRoleFilter('')}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all border',
              !roleFilter
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            )}>
            Tous les rôles
          </button>
          {ROLE_FILTERS.map(role => {
            const cfg = ROLE_CONFIG[role] ?? DEFAULT_ROLE
            const active = roleFilter === role
            return (
              <button key={role} onClick={() => setRoleFilter(active ? '' : role)}
                className={cn(
                  'px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
                  active ? cn('border text-white bg-gradient-to-r', cfg.gradient, 'border-transparent') : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                )}>
                {role}
              </button>
            )
          })}
        </div>

        {/* Search + city */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, expertise…"
              className="input pl-10 text-sm bg-white" />
          </div>
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
            className="input w-auto min-w-36 text-sm bg-white">
            <option value="">Toutes les villes</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(search || roleFilter || cityFilter) && (
            <button onClick={() => { setSearch(''); setRoleFilter(''); setCityFilter('') }}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition-colors whitespace-nowrap">
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* ── Results count ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-900">{filtered.length}</span> Master{filtered.length > 1 ? 's' : ''} {roleFilter ? `· ${roleFilter}` : ''} {cityFilter ? `· ${cityFilter}` : ''}
        </p>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 h-64 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-20 text-center">
          <Crown className="w-10 h-10 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-medium mb-1">Aucun Master trouvé</p>
          <p className="text-slate-300 text-sm">Essayez d&apos;autres filtres</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((master, i) => (
            <MasterCard key={master.id} master={master} index={i} />
          ))}
        </div>
      )}

      {/* ── Bottom CTA ── */}
      {filtered.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="font-bold text-slate-900 text-lg mb-1" style={{ fontFamily: 'Syne,sans-serif' }}>
              Vous êtes décideur ? Rejoignez MeetMaster.
            </p>
            <p className="text-slate-500 text-sm">
              Ouvrez votre agenda 4 fois/mois et soyez rémunéré 500 MAD par meeting.
            </p>
          </div>
          <Link href="/meetmaster/apply"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold px-6 py-3 rounded-xl text-sm hover:shadow-md hover:shadow-amber-200 hover:-translate-y-0.5 transition-all whitespace-nowrap">
            <Crown className="w-4 h-4" />
            Devenir Master
          </Link>
        </div>
      )}
    </div>
  )
}
