'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, LayoutDashboard, Wallet, LogOut, ChevronDown, Users2, Crown, Calendar, Target, Settings, Database, Upload } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import type { Profile } from '@/types'
import { cn } from '@/lib/utils'

interface NavbarProps {
  profile: Profile & { plan_id?: string; is_admin?: boolean }
  blockedFeatures?: string[]
}

const PLAN_BADGES: Record<string, { label: string; color: string }> = {
  decouverte: { label: '🌱', color: 'bg-surface-2 text-ink-3 border-[rgba(0,0,0,0.08)]' },
  solo:       { label: '⚡ Solo',     color: 'bg-brand-50 text-brand-700 border-brand-100' },
  equipe:     { label: '👥 Équipe',   color: 'bg-violet-50 text-violet-700 border-violet-100' },
  business:   { label: '🚀 Business', color: 'bg-gold-50 text-gold-700 border-gold-100' },
  entreprise: { label: '🏢 Ent.',     color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
}

export default function Navbar({ profile, blockedFeatures = [] }: NavbarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)
  const [credits, setCredits] = useState(profile.credit_balance)
  const dropRef  = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => { setCredits(profile.credit_balance) }, [profile.credit_balance])
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/'); router.refresh()
  }

  const is = (feature: string) => !blockedFeatures.includes(feature)

  const allNavLinks = [
    { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard, feature: null            },
    { href: '/search',     label: 'Recherche',  icon: Search,          feature: 'search'        },
    { href: '/databases',  label: 'Recherches', icon: Database,        feature: 'search'        },
    { href: '/crm',        label: 'CRM',        icon: Users2,          feature: 'crm'           },
    { href: '/upload',     label: 'Import',     icon: Upload,          feature: 'data_upload'   },
    { href: '/meetings',   label: 'Meetings',   icon: Calendar,        feature: 'meetmaster'    },
  ]
  const navLinks = allNavLinks.filter(l => !l.feature || is(l.feature))
  const meetmasterBlocked = blockedFeatures.includes('meetmaster')
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const planId = profile.plan_id ?? 'decouverte'
  const planBadge = PLAN_BADGES[planId] ?? PLAN_BADGES.decouverte

  return (
    <header className="bg-white/95 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-5 h-[54px] flex items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0 group">
          <div className="w-6 h-6 bg-brand-600 rounded-[7px] flex items-center justify-center group-hover:bg-brand-700 transition-colors">
            <Target className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-ink-1 text-[14px] tracking-tight hidden sm:block">LeadMaster</span>
        </Link>

        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all duration-150',
                isActive(href) ? 'bg-brand-50 text-brand-700' : 'text-ink-3 hover:text-ink-1 hover:bg-surface-2'
              )}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:block">{label}</span>
            </Link>
          ))}
          {!meetmasterBlocked && (
            <Link href="/meetmaster"
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold transition-all duration-150',
                isActive('/meetmaster') || isActive('/master')
                  ? 'bg-gold-50 text-gold-700 border border-gold-100'
                  : 'text-gold-600 hover:bg-gold-50'
              )}>
              <Crown className="w-3.5 h-3.5" />
              <span className="hidden sm:block">MeetMaster</span>
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {/* Credits */}
          <Link href="/wallet"
            className="flex items-center gap-1.5 bg-gold-50 border border-gold-100 text-gold-700 rounded-pill px-3 py-1.5 text-[12px] font-bold hover:bg-gold-100 transition-colors">
            <span className="text-gold-500 text-[10px]">◆</span>
            <span className="font-mono">{credits.toLocaleString()}</span>
            <span className="text-gold-500/60 hidden sm:block">cr</span>
          </Link>

          {/* User menu */}
          <div className="relative" ref={dropRef}>
            <button onClick={() => setOpen(!open)}
              className="flex items-center gap-1.5 rounded-[8px] hover:bg-surface-2 pl-1.5 pr-2 py-1.5 transition-colors">
              <div className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center">
                <span className="text-brand-700 font-bold text-[11px]">
                  {(profile.full_name || profile.email || 'U')[0].toUpperCase()}
                </span>
              </div>
              <span className={cn('badge border text-[10px] hidden sm:flex px-1.5 py-0.5', planBadge.color)}>
                {planBadge.label}
              </span>
              <ChevronDown className={cn('w-3 h-3 text-ink-4 transition-transform duration-150', open && 'rotate-180')} />
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-[rgba(0,0,0,0.07)] rounded-[14px] shadow-floating py-1.5 z-50 animate-scale-in">
                <div className="px-4 py-2.5 border-b border-[rgba(0,0,0,0.05)]">
                  <p className="font-semibold text-[13px] text-ink-1 truncate">{profile.full_name || 'Utilisateur'}</p>
                  <p className="text-[11px] text-ink-4 truncate">{profile.email}</p>
                </div>
                <div className="py-1">
                  {[
                    { href: '/account',     label: 'Mon compte',      icon: Settings,  feature: null         },
                    { href: '/account/plan',label: 'Changer de plan', icon: Crown,     feature: null         },
                    { href: '/master',      label: 'Profil Master',   icon: Crown,     feature: 'meetmaster' },
                    { href: '/meetings',    label: 'Mes meetings',    icon: Calendar,  feature: 'meetmaster' },
                    { href: '/crm',         label: 'Mon CRM',         icon: Users2,    feature: 'crm'        },
                    { href: '/wallet',      label: 'Mes crédits',     icon: Wallet,    feature: null         },
                  ].filter(item => !item.feature || is(item.feature)).map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href}
                      className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-ink-2 hover:bg-surface-1 hover:text-ink-1 transition-colors"
                      onClick={() => setOpen(false)}>
                      <Icon className="w-3.5 h-3.5 text-ink-4" />{label}
                    </Link>
                  ))}
                  {profile.is_admin && (
                    <Link href="/admin"
                      className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-brand-600 hover:bg-brand-50 transition-colors border-t border-[rgba(0,0,0,0.05)] mt-1"
                      onClick={() => setOpen(false)}>
                      <Target className="w-3.5 h-3.5" /> Admin panel
                    </Link>
                  )}
                  <button onClick={signOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors border-t border-[rgba(0,0,0,0.05)] mt-1">
                    <LogOut className="w-3.5 h-3.5" /> Se déconnecter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
