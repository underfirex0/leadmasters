'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, LayoutDashboard, Wallet, LogOut, ChevronDown, Users2, Crown, Calendar, Target, Settings, Database, Upload, Menu, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  const [open, setOpen] = useState(false)        // user dropdown
  const [mobileOpen, setMobileOpen] = useState(false) // mobile nav drawer
  const [mounted, setMounted] = useState(false)  // portal needs document to exist
  const [credits, setCredits] = useState(profile.credit_balance)
  const dropRef  = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { setCredits(profile.credit_balance) }, [profile.credit_balance])
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])
  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])
  // Lock body scroll when mobile drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

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

  const accountLinks = [
    { href: '/account',     label: 'Mon compte',      icon: Settings,  feature: null         },
    { href: '/account/plan',label: 'Changer de plan', icon: Crown,     feature: null         },
    { href: '/master',      label: 'Profil Master',   icon: Crown,     feature: 'meetmaster' },
    { href: '/meetings',    label: 'Mes meetings',    icon: Calendar,  feature: 'meetmaster' },
    { href: '/crm',         label: 'Mon CRM',         icon: Users2,    feature: 'crm'        },
    { href: '/wallet',      label: 'Mes crédits',     icon: Wallet,    feature: null         },
  ].filter(item => !item.feature || is(item.feature))

  return (
    <>
    <header className="bg-white/95 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-5 h-[54px] flex items-center justify-between gap-2 sm:gap-4">

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 -ml-2 rounded-[8px] hover:bg-surface-2 transition-colors shrink-0"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5 text-ink-2" />
        </button>

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0 group">
          <div className="w-6 h-6 bg-brand-600 rounded-[7px] flex items-center justify-center group-hover:bg-brand-700 transition-colors">
            <Target className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-ink-1 text-[14px] tracking-tight hidden sm:block">LeadMaster</span>
        </Link>

        {/* Desktop nav — hidden below lg, full drawer used instead */}
        <nav className="hidden lg:flex items-center gap-0.5 overflow-x-auto flex-1 justify-center">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all duration-150 whitespace-nowrap',
                isActive(href) ? 'bg-brand-50 text-brand-700' : 'text-ink-3 hover:text-ink-1 hover:bg-surface-2'
              )}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          ))}
          {!meetmasterBlocked && (
            <Link href="/meetmaster"
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold transition-all duration-150 whitespace-nowrap',
                isActive('/meetmaster') || isActive('/master')
                  ? 'bg-gold-50 text-gold-700 border border-gold-100'
                  : 'text-gold-600 hover:bg-gold-50'
              )}>
              <Crown className="w-3.5 h-3.5" />
              MeetMaster
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Credits */}
          <Link href="/wallet"
            className="flex items-center gap-1 sm:gap-1.5 bg-gold-50 border border-gold-100 text-gold-700 rounded-pill px-2 sm:px-3 py-1.5 text-[11px] sm:text-[12px] font-bold hover:bg-gold-100 transition-colors">
            <span className="text-gold-500 text-[10px]">◆</span>
            <span className="font-mono">{credits.toLocaleString()}</span>
            <span className="text-gold-500/60 hidden sm:block">cr</span>
          </Link>

          {/* User menu */}
          <div className="relative" ref={dropRef}>
            <button onClick={() => setOpen(!open)}
              className="flex items-center gap-1.5 rounded-[8px] hover:bg-surface-2 pl-1.5 pr-1.5 sm:pr-2 py-1.5 transition-colors">
              <div className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-brand-700 font-bold text-[11px]">
                  {(profile.full_name || profile.email || 'U')[0].toUpperCase()}
                </span>
              </div>
              <span className={cn('badge border text-[10px] hidden sm:flex px-1.5 py-0.5', planBadge.color)}>
                {planBadge.label}
              </span>
              <ChevronDown className={cn('w-3 h-3 text-ink-4 transition-transform duration-150 hidden sm:block', open && 'rotate-180')} />
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-1.5 w-60 max-w-[calc(100vw-2rem)] bg-white border border-[rgba(0,0,0,0.07)] rounded-[14px] shadow-floating py-1.5 z-50 animate-scale-in">
                <div className="px-4 py-2.5 border-b border-[rgba(0,0,0,0.05)]">
                  <p className="font-semibold text-[13px] text-ink-1 truncate">{profile.full_name || 'Utilisateur'}</p>
                  <p className="text-[11px] text-ink-4 truncate">{profile.email}</p>
                  <span className={cn('inline-flex badge border text-[10px] mt-1.5 px-1.5 py-0.5', planBadge.color)}>{planBadge.label}</span>
                </div>
                <div className="py-1">
                  {accountLinks.map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href}
                      className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-ink-2 hover:bg-surface-1 hover:text-ink-1 transition-colors"
                      onClick={() => setOpen(false)}>
                      <Icon className="w-3.5 h-3.5 text-ink-4 shrink-0" />{label}
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

    {/* ── Mobile nav drawer — rendered via portal directly into <body> ──
         This is REQUIRED: the header above uses backdrop-blur-xl, and per the
         CSS spec, backdrop-filter creates a new containing block for any
         position:fixed descendants. If the drawer stayed inside <header>,
         "fixed top-0 bottom-0" would resolve against the 54px header box
         instead of the viewport, crushing all drawer content into a sliver.
         Rendering through a portal to document.body sidesteps that entirely. */}
    {mounted && mobileOpen && createPortal(
      <>
        <div
          className="fixed inset-0 bg-black/40 z-[60] lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
        <div className="fixed top-0 left-0 bottom-0 w-[78vw] max-w-[300px] bg-white z-[70] lg:hidden flex flex-col shadow-floating animate-slide-in-left">
          <div className="flex items-center justify-between p-4 border-b border-[rgba(0,0,0,0.06)] shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-brand-600 rounded-[7px] flex items-center justify-center">
                <Target className="w-3 h-3 text-white" />
              </div>
              <span className="font-bold text-ink-1 text-[14px] tracking-tight">LeadMaster</span>
            </div>
            <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-surface-2 transition-colors" aria-label="Fermer">
              <X className="w-4 h-4 text-ink-3" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium transition-colors',
                  isActive(href) ? 'bg-brand-50 text-brand-700' : 'text-ink-2 hover:bg-surface-1'
                )}>
                <Icon className="w-4 h-4 shrink-0" />{label}
              </Link>
            ))}
            {!meetmasterBlocked && (
              <Link href="/meetmaster"
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-semibold transition-colors',
                  isActive('/meetmaster') || isActive('/master') ? 'bg-gold-50 text-gold-700' : 'text-gold-600 hover:bg-gold-50'
                )}>
                <Crown className="w-4 h-4 shrink-0" /> MeetMaster
              </Link>
            )}

            <div className="border-t border-[rgba(0,0,0,0.06)] my-2 pt-2">
              {accountLinks.filter(l => !navLinks.find(n => n.href === l.href) && l.href !== '/meetmaster').map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] text-ink-2 hover:bg-surface-1 transition-colors">
                  <Icon className="w-4 h-4 text-ink-4 shrink-0" />{label}
                </Link>
              ))}
              {profile.is_admin && (
                <Link href="/admin" className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] text-brand-600 hover:bg-brand-50 transition-colors">
                  <Target className="w-4 h-4 shrink-0" /> Admin panel
                </Link>
              )}
            </div>
          </nav>

          <div className="p-4 border-t border-[rgba(0,0,0,0.06)] shrink-0 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-brand-700 font-bold text-[12px]">{(profile.full_name || profile.email || 'U')[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-ink-1 truncate">{profile.full_name || 'Utilisateur'}</p>
                <p className="text-[11px] text-ink-4 truncate">{profile.email}</p>
              </div>
              <span className={cn('badge border text-[10px] px-1.5 py-0.5 shrink-0', planBadge.color)}>{planBadge.label}</span>
            </div>
            <button onClick={signOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
              <LogOut className="w-4 h-4" /> Se déconnecter
            </button>
          </div>
        </div>
      </>,
      document.body
    )}
    </>
  )
}
