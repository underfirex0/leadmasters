import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  ArrowLeft, Star, MapPin, CheckCircle, Crown,
  Calendar, Clock, Linkedin, ChevronRight, Users
} from 'lucide-react'
import type { Master } from '@/types'

const ROLE_CONFIG: Record<string, { gradient: string; badge: string }> = {
  'DRH':                   { gradient: 'from-rose-400 to-pink-500',    badge: 'bg-rose-50 text-rose-700' },
  'Directrice des RH':     { gradient: 'from-rose-400 to-pink-500',    badge: 'bg-rose-50 text-rose-700' },
  'DAF':                   { gradient: 'from-blue-500 to-indigo-600',   badge: 'bg-blue-50 text-blue-700' },
  'DG / CEO':              { gradient: 'from-amber-400 to-orange-500', badge: 'bg-amber-50 text-amber-700' },
  'Directeur des Achats':  { gradient: 'from-emerald-500 to-teal-600', badge: 'bg-emerald-50 text-emerald-700' },
  'Directrice des Achats': { gradient: 'from-emerald-500 to-teal-600', badge: 'bg-emerald-50 text-emerald-700' },
  'DSI':                   { gradient: 'from-violet-500 to-purple-600', badge: 'bg-violet-50 text-violet-700' },
  'Directeur Commercial':  { gradient: 'from-cyan-500 to-sky-600',     badge: 'bg-cyan-50 text-cyan-700' },
  'Directeur Marketing':   { gradient: 'from-fuchsia-500 to-pink-600', badge: 'bg-fuchsia-50 text-fuchsia-700' },
}

const AVATAR_BG: Record<string, string> = {
  'DRH':'fecdd3','Directrice des RH':'fbcfe8','DAF':'bfdbfe','DG / CEO':'fde68a',
  'Directeur des Achats':'bbf7d0','Directrice des Achats':'a7f3d0',
  'DSI':'ddd6fe','Directeur Commercial':'a5f3fc','Directeur Marketing':'f5d0fe',
}

function getAvatarUrl(m: Master & { avatar_url?: string | null }): string {
  if (m.avatar_url) return m.avatar_url
  const bg   = AVATAR_BG[m.role] ?? 'e2e8f0'
  const seed = encodeURIComponent(m.display_name.replace(/[\s.]/g, ''))
  return `https://api.dicebear.com/9.x/micah/svg?seed=${seed}&backgroundColor=${bg}`
}

export default async function MasterProfilePage({ params }: { params: { id: string } }) {
  const { data: master, error } = await supabaseAdmin
    .from('masters')
    .select('*')
    .eq('id', params.id)
    .eq('application_status', 'approved')
    .single()

  if (error || !master) notFound()

  const m = master as Master & { avatar_url?: string | null }
  const cfg       = ROLE_CONFIG[m.role] ?? { gradient: 'from-slate-500 to-slate-700', badge: 'bg-slate-50 text-slate-700' }
  const avatarUrl = getAvatarUrl(m)
  const expertise = m.expertise ?? []
  const topics    = m.topics    ?? []

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <Link href="/meetmaster" className="btn-secondary inline-flex items-center gap-2 text-sm">
        <ArrowLeft className="w-4 h-4" /> Tous les Masters
      </Link>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className={`h-28 bg-gradient-to-br ${cfg.gradient} relative`}>
          <div className="absolute inset-0 opacity-20 grid-bg" />
        </div>

        <div className="px-7 pb-7">
          {/* Avatar row */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 mb-6">
            <div className="flex items-end gap-4">
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-white shadow-lg shrink-0 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarUrl} alt={m.display_name} className="w-full h-full object-cover" />
              </div>
              <div className="mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Syne,sans-serif' }}>
                    {m.display_name}
                  </h1>
                  {m.is_verified && (
                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 text-xs font-semibold text-amber-700">
                      <CheckCircle className="w-3 h-3" /> Vérifié
                    </div>
                  )}
                </div>
                <span className={`inline-block text-sm font-semibold px-3 py-1 rounded-full mt-1 ${cfg.badge}`}>
                  {m.role}
                </span>
              </div>
            </div>

            {m.average_rating && (
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2.5 self-start">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold text-slate-900 text-lg">{m.average_rating}</span>
                <span className="text-slate-400 text-sm">/5 · {m.meetings_completed} meetings</span>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-5 pb-5 mb-6 border-b border-slate-100">
            {([
              { icon: Clock,    text: '30 minutes' },
              { icon: Calendar, text: `${m.max_meetings_per_month} meetings / mois` },
              ...(m.city           ? [{ icon: MapPin, text: m.city }]           : []),
              ...(m.company_sector ? [{ icon: Users,  text: m.company_sector }] : []),
            ] as { icon: React.ElementType; text: string }[]).map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-sm text-slate-500">
                <Icon className="w-4 h-4 text-slate-400" />
                {text}
              </div>
            ))}
            {m.linkedin_url && (
              <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                <Linkedin className="w-4 h-4" /> LinkedIn
              </a>
            )}
          </div>

          {/* Bio */}
          {m.bio && (
            <div className="mb-6">
              <h2 className="font-bold text-slate-900 mb-2" style={{ fontFamily: 'Syne,sans-serif' }}>À propos</h2>
              <p className="text-slate-600 leading-relaxed">{m.bio}</p>
            </div>
          )}

          {/* Expertise */}
          {expertise.length > 0 && (
            <div className="mb-6">
              <h2 className="font-bold text-slate-900 mb-3" style={{ fontFamily: 'Syne,sans-serif' }}>Expertises</h2>
              <div className="flex flex-wrap gap-2">
                {expertise.map((tag: string) => (
                  <span key={tag} className="bg-slate-50 border border-slate-100 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Topics */}
          {topics.length > 0 && (
            <div>
              <h2 className="font-bold text-slate-900 mb-3" style={{ fontFamily: 'Syne,sans-serif' }}>
                Ce que vous apprendrez
              </h2>
              <ul className="space-y-2.5">
                {topics.map((topic: string) => (
                  <li key={topic} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                    </div>
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Booking CTA */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-7 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <p className="font-bold text-white text-lg" style={{ fontFamily: 'Syne,sans-serif' }}>
                Réserver un meeting
              </p>
            </div>
            <p className="text-white/50 text-sm mb-3">30 minutes · Visioconférence · Réponse sous 24h</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne,sans-serif' }}>1 000</span>
              <span className="text-white/50">MAD</span>
              <span className="text-white/30 text-sm">· facture après confirmation</span>
            </div>
          </div>
          <Link href={`/meetmaster/book/${m.id}`}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold px-7 py-3.5 rounded-xl hover:shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5 transition-all text-sm whitespace-nowrap">
            Réserver ce meeting
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
