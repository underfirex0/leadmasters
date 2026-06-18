'use client'

import { useState, useEffect, useRef, RefObject } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import gsap from 'gsap'
import {
  ArrowRight, Check, ChevronDown, X, Menu,
  Search, Lock, Users2, Download, Sparkles,
  Crown, MapPin, Target, Shield, Star,
  PlayCircle, Globe, BarChart2, CalendarClock, Filter, Unlock
} from 'lucide-react'
import { cn } from '@/lib/utils'

// No ScrollTrigger — using IntersectionObserver instead (production-safe)
const HeroCanvas = dynamic(
  () => import('@/components/landing/HeroCanvas'),
  { ssr: false, loading: () => null }
)

// ─── Shared reveal hook (IntersectionObserver) ─────────────
function useReveal(ref: RefObject<HTMLElement | null>, selector = '.reveal-item') {
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      // Fallback: make everything visible immediately
      ref.current?.querySelectorAll(selector).forEach(el => el.classList.add('revealed'))
      return
    }
    const items = Array.from(el.querySelectorAll<HTMLElement>(selector))
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); observer.unobserve(e.target) } }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    items.forEach(item => observer.observe(item))
    return () => observer.disconnect()
  }, [ref, selector])
}

// ─── Announcement Bar ──────────────────────────────────────
function AnnouncementBar({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="relative bg-brand-600 text-white text-[13px] py-2.5 px-4 flex items-center justify-center gap-3">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-200 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
      </span>
      <span className="font-medium hidden sm:inline">MeetMaster est live — rencontrez des décideurs marocains en 48h.</span>
      <span className="font-medium sm:hidden">MeetMaster est live.</span>
      <Link href="/meetmaster" className="font-semibold underline underline-offset-2 hover:no-underline whitespace-nowrap">Découvrir →</Link>
      <button onClick={onDismiss} aria-label="Fermer" className="absolute right-4 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Navigation ────────────────────────────────────────────
function Nav({ hasBar }: { hasBar: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  const links = [
    { label: 'Fonctionnalités', href: '#features'  },
    { label: 'Tarification',    href: '#pricing'   },
    { label: 'MeetMaster',      href: '/meetmaster'},
    { label: 'FAQ',             href: '#faq'       },
  ]
  return (
    <nav className={cn('fixed left-0 right-0 z-50 transition-all duration-300 px-5', hasBar ? 'top-[40px]' : 'top-0')}>
      <div className="max-w-[1200px] mx-auto pt-3">
        <div className={cn('flex items-center justify-between px-5 h-14 rounded-pill transition-all duration-300',
          scrolled ? 'bg-white/95 backdrop-blur-xl shadow-[0_4px_32px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.05)]' : 'bg-transparent')}>
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group" aria-label="LeadMaster">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-brand-700 transition-colors">
              <Target className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-ink-1 text-[15px] tracking-tight">LeadMaster</span>
          </Link>
          <div className="hidden md:flex items-center gap-0.5">
            {links.map(l => (
              <a key={l.href} href={l.href} className="text-[13.5px] font-medium text-ink-3 hover:text-ink-1 px-3.5 py-2 rounded-lg hover:bg-surface-2 transition-all duration-150">{l.label}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Link href="/login" className="text-[13px] font-medium text-ink-3 hover:text-ink-1 px-3.5 py-2 transition-colors">Se connecter</Link>
            <Link href="/register" className="btn-brand btn-sm group">
              Commencer gratuitement <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <button className="md:hidden p-2 rounded-lg hover:bg-surface-2 transition-colors" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden mt-2 bg-white border border-[rgba(0,0,0,0.07)] rounded-2xl shadow-floating p-3 animate-scale-in">
            {links.map(l => (
              <a key={l.href} href={l.href} className="block text-[14px] font-medium text-ink-2 hover:text-ink-1 hover:bg-surface-1 px-4 py-3 rounded-xl transition-colors" onClick={() => setMobileOpen(false)}>{l.label}</a>
            ))}
            <div className="border-t border-[rgba(0,0,0,0.06)] mt-2 pt-2 space-y-2">
              <Link href="/login" className="block text-[14px] text-center font-medium text-ink-3 py-3 hover:bg-surface-1 rounded-xl">Se connecter</Link>
              <Link href="/register" className="btn-brand w-full justify-center text-sm">Commencer gratuitement</Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

// ─── Product Mockup ────────────────────────────────────────
function ProductMockup() {
  const rows = [
    { name: 'BATIPRO MAROC SARL',  sector: 'BTP',       city: 'Casablanca', phone: '0522 45 67 89', dir: null          },
    { name: 'TECHWAVE MAROC SA',   sector: 'IT',         city: 'Casablanca', phone: null,            dir: 'Y. Tahiri'   },
    { name: 'ATLAS TRADING SARL',  sector: 'Commerce',   city: 'Rabat',      phone: '0537 22 33 44', dir: null          },
    { name: 'EXPORTMA SARL',       sector: 'Import/Exp', city: 'Agadir',     phone: null,            dir: 'N. Ait Ahmed'},
    { name: 'CONSTRUCTA ATLAS SA', sector: 'BTP',        city: 'Tanger',     phone: '0539 12 34 56', dir: null          },
  ]
  return (
    <div className="relative w-full max-w-[580px]">
      <div className="absolute -inset-8 bg-gradient-to-b from-brand-100/30 via-brand-50/15 to-transparent blur-3xl -z-10 rounded-3xl" />
      <div className="rounded-[18px] overflow-hidden bg-white shadow-[0_24px_80px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)]"
        style={{ transform: 'perspective(1200px) rotateY(-5deg) rotateX(2deg)' }}>
        <div className="bg-[#F5F5F3] border-b border-[rgba(0,0,0,0.07)] px-4 py-3 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]"/><div className="w-3 h-3 rounded-full bg-[#FEBC2E]"/><div className="w-3 h-3 rounded-full bg-[#28C840]"/>
          </div>
          <div className="flex-1 mx-2 bg-white border border-[rgba(0,0,0,0.07)] rounded-md px-3 py-1.5 flex items-center gap-2">
            <span className="text-[11px] text-ink-4 font-mono flex-1">app.leadmaster.ma/results</span>
            <Shield className="w-3 h-3 text-emerald-500" />
          </div>
          <div className="flex items-center gap-1.5 bg-gold-50 border border-gold-100 rounded-pill px-2.5 py-1 shrink-0">
            <span className="text-[9px] text-gold-500">◆</span>
            <span className="text-[11px] font-bold font-mono text-gold-700">240</span>
            <span className="text-[9px] text-gold-500/60">cr</span>
          </div>
        </div>
        <div className="bg-white px-4 py-2.5 border-b border-[rgba(0,0,0,0.05)] flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 bg-brand-600 rounded-md flex items-center justify-center"><Target className="w-2.5 h-2.5 text-white" /></div>
            <span className="text-[11px] font-bold text-ink-1">LeadMaster</span>
          </div>
          <div className="flex items-center gap-0.5 ml-1">
            {['Dashboard','Prospecter','CRM'].map((item, i) => (
              <span key={item} className={cn('text-[10px] font-medium px-2 py-1 rounded-md', i===1?'bg-brand-50 text-brand-700':'text-ink-4')}>{item}</span>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1 text-[9px] text-ink-4 bg-surface-1 border border-[rgba(0,0,0,0.07)] rounded-md px-2 py-1">
            <Filter className="w-2.5 h-2.5"/><span>BTP · Casablanca</span>
          </div>
          <div className="flex items-center gap-1 bg-brand-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-md shrink-0">
            <Sparkles className="w-2.5 h-2.5"/> Lancer
          </div>
        </div>
        <div className="bg-white">
          <div className="grid grid-cols-[2fr_0.8fr_1fr_1fr] px-4 py-2 border-b border-[rgba(0,0,0,0.05)] bg-surface-1">
            {['Entreprise','Ville','Téléphone','Dirigeant'].map(h=>(
              <span key={h} className="text-[9px] font-semibold text-ink-4 uppercase tracking-wide">{h}</span>
            ))}
          </div>
          {rows.map((row,i)=>(
            <div key={row.name} className={cn('grid grid-cols-[2fr_0.8fr_1fr_1fr] px-4 py-2.5 border-b border-[rgba(0,0,0,0.04)] hover:bg-[rgba(79,70,229,0.025)] transition-colors', i===rows.length-1&&'border-b-0')}>
              <div className="min-w-0 pr-2"><div className="text-[10px] font-semibold text-ink-1 truncate">{row.name}</div><div className="text-[9px] text-ink-4">{row.sector}</div></div>
              <div className="text-[10px] text-ink-3 flex items-center gap-1"><MapPin className="w-2.5 h-2.5 text-ink-5 shrink-0"/><span className="truncate">{row.city}</span></div>
              <div className="flex items-center">
                {row.phone ? <span className="text-[10px] font-mono text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded truncate">{row.phone}</span>
                  : <span className="inline-flex items-center gap-1 bg-gold-50 border border-gold-200 text-gold-700 rounded-full px-1.5 py-0.5 text-[9px] font-bold"><Lock className="w-2 h-2"/>1 cr</span>}
              </div>
              <div className="flex items-center">
                {row.dir ? <span className="text-[10px] text-ink-2 truncate">{row.dir}</span>
                  : <span className="inline-flex items-center gap-1 bg-gold-50 border border-gold-200 text-gold-700 rounded-full px-1.5 py-0.5 text-[9px] font-bold"><Lock className="w-2 h-2"/>2 cr</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-surface-1 border-t border-[rgba(0,0,0,0.05)] px-4 py-2 flex items-center justify-between">
          <span className="text-[10px] text-ink-4">5 résultats · 12 crédits utilisés</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-brand-600 bg-brand-50 px-2 py-1 rounded-pill border border-brand-100 cursor-pointer"><Users2 className="w-2.5 h-2.5"/> Ajouter au CRM</span>
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-ink-3 bg-white px-2 py-1 rounded-pill border border-[rgba(0,0,0,0.08)]"><Download className="w-2.5 h-2.5"/> CSV</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Hero (GSAP entrance only — no ScrollTrigger) ──────────
function Hero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const headRef      = useRef<HTMLHeadingElement>(null)
  const subRef       = useRef<HTMLParagraphElement>(null)
  const ctaRef       = useRef<HTMLDivElement>(null)
  const mockupRef    = useRef<HTMLDivElement>(null)
  const statsRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from(headRef.current,   { opacity: 0, y: 44, duration: 0.95 }, 0.1)
        .from(subRef.current,    { opacity: 0, y: 28, duration: 0.85 }, 0.35)
        .from(ctaRef.current,    { opacity: 0, y: 22, duration: 0.75 }, 0.55)
        .from(mockupRef.current, { opacity: 0, x: 48, duration: 1.1  }, 0.25)
      // Counter animations
      statsRef.current?.querySelectorAll('[data-count]').forEach(el => {
        const target = parseFloat(el.getAttribute('data-count') || '0')
        const suffix = el.getAttribute('data-suffix') || ''
        const obj = { v: 0 }
        gsap.to(obj, { v: target, duration: 1.8, ease: 'power2.out', delay: 0.8,
          onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString('fr-MA') + suffix } })
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={containerRef} className="relative min-h-screen flex flex-col pt-24 overflow-hidden bg-[#FAFAF9]">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true"><HeroCanvas /></div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAFAF9]/65 via-[#FAFAF9]/25 to-[#FAFAF9]/80 pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 max-w-[1200px] mx-auto px-5 w-full flex-1 flex flex-col justify-center">
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-center py-16">
          <div className="max-w-[560px]">
            <div className="inline-flex items-center gap-2 bg-white border border-[rgba(0,0,0,0.07)] rounded-pill px-4 py-2 shadow-xs mb-8">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"/>
              </span>
              <span className="text-[12px] font-semibold text-ink-2">662 entreprises marocaines vérifiées</span>
            </div>
            <h1 ref={headRef} className="font-extrabold text-ink-1 leading-[1.05] mb-6" style={{ fontSize:'clamp(38px,5.5vw,66px)', letterSpacing:'-2.5px' }}>
              Prospectez le Maroc.{' '}
              <span className="relative text-brand-600">
                Avec précision.
                <svg className="absolute -bottom-2 left-0 right-0 w-full" height="6" viewBox="0 0 200 6" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M0 4 Q50 0 100 4 Q150 8 200 4" stroke="#C7D2FE" strokeWidth="3" fill="none" strokeLinecap="round"/>
                </svg>
              </span>
            </h1>
            <p ref={subRef} className="text-[17px] text-ink-3 leading-[1.65] mb-8 max-w-[460px]">
              Données B2B marocaines vérifiées. Contacts directs des dirigeants. Payez uniquement les champs dont vous avez besoin — 1 crédit par numéro de téléphone.
            </p>
            <div ref={ctaRef} className="flex flex-wrap items-center gap-3 mb-10">
              <Link href="/register" className="btn-brand btn-lg group shadow-[0_8px_24px_rgba(79,70,229,0.28)]">
                Commencer gratuitement <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"/>
              </Link>
              <a href="#features" className="btn-ghost btn-lg group">
                <PlayCircle className="w-4 h-4 text-ink-4 group-hover:text-ink-1 transition-colors"/> Voir la démo
              </a>
            </div>
            <div className="flex items-center gap-3 text-[13px] text-ink-4">
              <div className="flex -space-x-2">
                {['KB','NA','YE','SA'].map(i=>(
                  <div key={i} className="w-7 h-7 rounded-full bg-brand-100 border-2 border-white flex items-center justify-center">
                    <span className="text-[9px] font-bold text-brand-700">{i}</span>
                  </div>
                ))}
              </div>
              <span>Rejoint par <strong className="text-ink-2">+200 commerciaux</strong> marocains</span>
            </div>
          </div>
          <div ref={mockupRef} className="hidden lg:flex items-center justify-end" aria-hidden="true">
            <div className="animate-float"><ProductMockup /></div>
          </div>
        </div>
        <div ref={statsRef} className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-8 border-t border-[rgba(0,0,0,0.06)]">
          {[
            { count:662, suffix:'',  label:'Entreprises vérifiées'      },
            { count:94,  suffix:'%', label:'Avec email professionnel'   },
            { count:95,  suffix:'%', label:'Avec numéro direct'         },
            { count:82,  suffix:'',  label:'Contacts direction DAF/DRH' },
          ].map(({count,suffix,label})=>(
            <div key={label} className="text-center sm:text-left">
              <span className="block text-[30px] sm:text-[34px] font-extrabold text-ink-1 tabular-nums" style={{letterSpacing:'-1.5px',lineHeight:1}} data-count={count} data-suffix={suffix}>
                {count}{suffix}
              </span>
              <p className="text-[12px] text-ink-4 mt-1 leading-snug">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Data Strip ────────────────────────────────────────────
function DataStrip() {
  const items = ['662 entreprises marocaines','94% avec e-mail professionnel','95% avec téléphone direct','82 contacts direction DAF · DRH','Sources officielles vérifiées','Zéro double facturation','Export CSV compatible Excel & HubSpot']
  return (
    <div className="bg-brand-600 py-3 overflow-hidden select-none" aria-hidden="true">
      <div className="ticker-track">
        {[...items,...items].map((item,i)=>(
          <span key={i} className="inline-flex items-center gap-3 px-6 text-[12px] font-semibold text-brand-100 whitespace-nowrap">
            <span className="w-1 h-1 rounded-full bg-brand-300/60 inline-block"/>{item}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── How It Works ──────────────────────────────────────────
function HowItWorks() {
  const sRef = useRef<HTMLElement>(null)
  useReveal(sRef, '.reveal-item')

  const steps = [
    { num:'01', icon:Filter,    color:'bg-brand-50 text-brand-600',    border:'border-brand-100',   title:'Filtrez par secteur, ville, effectif',    body:'Choisissez vos critères parmi 12 secteurs et 16 villes marocaines. Voyez le coût total avant de valider.' },
    { num:'02', icon:BarChart2, color:'bg-violet-50 text-violet-600',  border:'border-violet-100',  title:'Estimez le coût avant de dépenser',        body:'Notre calculateur affiche combien d\'entreprises correspondent et combien ça coûte — avant de débiter un seul crédit.' },
    { num:'03', icon:Unlock,    color:'bg-emerald-50 text-emerald-600',border:'border-emerald-100', title:'Payez uniquement ce que vous utilisez',     body:'Téléphone = 1 cr. Email dirigeant = 5 cr. Un champ déjà débloqué n\'est jamais refacturé. Exportez en CSV ou ajoutez au CRM.' },
  ]

  return (
    <section ref={sRef} className="py-24 px-5 bg-white" id="features">
      <div className="max-w-[1200px] mx-auto">
        <div className="max-w-[520px] mb-16">
          <p className="text-[12px] font-bold uppercase tracking-[1.5px] text-brand-600 mb-3">Comment ça marche</p>
          <h2 className="font-extrabold text-ink-1 mb-4" style={{fontSize:'clamp(28px,3.5vw,42px)',letterSpacing:'-1.5px',lineHeight:1.15}}>
            De la recherche au premier appel en moins de 5 minutes.
          </h2>
          <p className="text-[16px] text-ink-3 leading-relaxed">Pas d&apos;abonnement. Pas de surprise. Achetez uniquement les données qui vous intéressent.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map(({num,icon:Icon,color,border,title,body})=>(
            <div key={num} className={cn('reveal-item relative bg-white rounded-2xl border p-8 hover:shadow-card-md hover:-translate-y-1 transition-all duration-300', border)}>
              <div className="flex items-start justify-between mb-6">
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center',color)}><Icon className="w-5 h-5"/></div>
                <span className="font-black text-[52px] leading-none" style={{color:'rgba(0,0,0,0.05)',letterSpacing:'-2px'}}>{num}</span>
              </div>
              <h3 className="font-bold text-ink-1 text-[17px] mb-3 leading-snug" style={{letterSpacing:'-0.3px'}}>{title}</h3>
              <p className="text-[14px] text-ink-3 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Features ──────────────────────────────────────────────
function Features() {
  const sRef = useRef<HTMLElement>(null)
  useReveal(sRef, '.reveal-item')

  const feats = [
    {icon:Search,        badge:'Ciblage',     bc:'bg-brand-50 text-brand-700',    title:'Recherche multi-critères',    body:'Secteur, ville, région, effectif, raison sociale. Combinez vos filtres et prévisualisez le nombre de résultats en temps réel.'},
    {icon:Lock,          badge:'Économique',  bc:'bg-violet-50 text-violet-700',  title:'Paiement au champ débloqué',  body:'Téléphone à 1 cr, email dirigeant à 5 cr. Vous contrôlez exactement ce que vous payez à chaque requête.'},
    {icon:Users2,        badge:'CRM',         bc:'bg-emerald-50 text-emerald-700',title:'Pipeline CRM intégré',        body:'Statuts d\'appel, historique, notes personnelles, rappels avec alertes. Votre pipeline complet sans quitter LeadMaster.'},
    {icon:CalendarClock, badge:'Rappels',     bc:'bg-amber-50 text-amber-700',    title:'Callbacks et relances',       body:'Programmez vos relances. Alertes rouge/orange/vert selon l\'urgence. Journaux d\'appel complets par prospect.'},
    {icon:Download,      badge:'Export',      bc:'bg-sky-50 text-sky-700',        title:'Export CSV compatible',       body:'Exportez en un clic vers Excel, HubSpot, Salesforce. Format propre et structuré, prêt à l\'emploi immédiatement.'},
    {icon:Shield,        badge:'Anti-doublon',bc:'bg-rose-50 text-rose-700',      title:'Zéro double facturation',     body:'Un champ déjà débloqué s\'affiche automatiquement sans crédits. Système de mémoire intelligent par entreprise.'},
  ]

  return (
    <section ref={sRef} className="py-24 px-5 bg-[#F7F7F5]">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-extrabold text-ink-1 mb-4" style={{fontSize:'clamp(28px,3.5vw,42px)',letterSpacing:'-1.5px',lineHeight:1.15}}>
            Tout ce qu&apos;il faut pour prospecter au Maroc.
          </h2>
          <p className="text-[16px] text-ink-3 max-w-[440px] mx-auto">Plus qu&apos;une base de données — un système de prospection B2B complet.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {feats.map(({icon:Icon,badge,bc,title,body})=>(
            <div key={title} className="reveal-item bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-7 hover:border-brand-100 hover:shadow-[0_4px_24px_rgba(79,70,229,0.07)] hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="flex items-start justify-between mb-5">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors"><Icon className="w-5 h-5 text-brand-600"/></div>
                <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-pill',bc)}>{badge}</span>
              </div>
              <h3 className="font-bold text-ink-1 text-[16px] mb-2.5 leading-snug" style={{letterSpacing:'-0.3px'}}>{title}</h3>
              <p className="text-[13.5px] text-ink-3 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Field Pricing ─────────────────────────────────────────
function FieldPricing() {
  const sRef = useRef<HTMLElement>(null)
  useReveal(sRef, '.reveal-item')

  const tiers = [
    {label:'Gratuit',           dot:'bg-emerald-500',badge:'bg-emerald-50 text-emerald-700 border-emerald-100',fields:['Raison sociale','Secteur','Ville & Région','Forme juridique']},
    {label:'1 cr / entreprise', dot:'bg-brand-500',  badge:'bg-brand-50 text-brand-700 border-brand-100',      fields:['Téléphone','E-mail professionnel','Site web','Adresse']},
    {label:'2 cr / entreprise', dot:'bg-violet-500', badge:'bg-violet-50 text-violet-700 border-violet-100',   fields:['Effectif','Nom du dirigeant','Année de création']},
    {label:'5 cr / entreprise', dot:'bg-amber-500',  badge:'bg-amber-50 text-amber-700 border-amber-100',      fields:['Tél. dirigeant','E-mail dirigeant','CA','Capital social','Contacts DAF · DRH']},
  ]

  return (
    <section ref={sRef} className="py-24 px-5 bg-white">
      <div className="max-w-[960px] mx-auto">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-16 items-center">
          <div className="reveal-item">
            <p className="text-[12px] font-bold uppercase tracking-[1.5px] text-brand-600 mb-4">Tarification transparente</p>
            <h2 className="font-extrabold text-ink-1 mb-5" style={{fontSize:'clamp(26px,3.5vw,40px)',letterSpacing:'-1.5px',lineHeight:1.15}}>
              1 crédit = 1 champ, <span className="text-brand-600">pour 1 entreprise.</span>
            </h2>
            <p className="text-[16px] text-ink-3 leading-relaxed mb-8">
              Vous ne payez que pour les données que vous déverrouillez. Jamais pour une base entière. Jamais deux fois pour le même champ.
            </p>
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-5">
              <p className="text-[14px] font-semibold text-brand-800 mb-2">Exemple concret</p>
              <p className="text-[13px] text-brand-700 leading-relaxed">10 entreprises · Téléphone + Email + Dirigeant :<br/><strong className="text-brand-900">(1 + 1 + 2) × 10 = 40 crédits</strong></p>
            </div>
          </div>
          <div className="space-y-3">
            {tiers.map(({label,dot,badge,fields},idx)=>(
              <div key={label} className="reveal-item bg-[#FAFAF9] border border-[rgba(0,0,0,0.06)] rounded-xl p-4 hover:border-[rgba(0,0,0,0.1)] hover:shadow-xs transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><div className={cn('w-2.5 h-2.5 rounded-full',dot)}/><span className="text-[13px] font-semibold text-ink-2">Tier {idx+1}</span></div>
                  <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-pill border',badge)}>{label}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {fields.map(f=><span key={f} className="text-[11px] text-ink-3 bg-white border border-[rgba(0,0,0,0.07)] px-2.5 py-1 rounded-pill">{f}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ───────────────────────────────────────────────
function Pricing() {
  const [annual, setAnnual] = useState(false)
  const sRef = useRef<HTMLElement>(null)
  useReveal(sRef, '.reveal-item')

  const plans = [
    {id:'decouverte',name:'Découverte',emoji:'🌱',pm:0,   pa:0,   cr:100,  period:'one-time',hot:false,badge:null,          color:'border-[rgba(0,0,0,0.08)]',feats:['100 crédits offerts','1 utilisateur','Export CSV (5 lignes)','CRM lecture seule','Support FAQ']},
    {id:'solo',      name:'Solo',      emoji:'⚡',pm:149, pa:119, cr:400,  period:'/mois',   hot:false,badge:null,          color:'border-brand-200',          feats:['400 crédits/mois','1 utilisateur','Rollover 1 mois','Export CSV 100 lignes','CRM complet','Support email 48h']},
    {id:'equipe',    name:'Équipe',    emoji:'👥',pm:390, pa:299, cr:1500, period:'/mois',   hot:true, badge:'Populaire',   color:'border-brand-400',          feats:['1 500 crédits/mois','3 utilisateurs','Rollover 2 mois','Export CSV illimité','CRM pipeline','Support prioritaire 24h']},
    {id:'business',  name:'Business',  emoji:'🚀',pm:990, pa:790, cr:5000, period:'/mois',   hot:false,badge:'Meilleur ROI',color:'border-gold-200',           feats:['5 000 crédits/mois','10 utilisateurs','Rollover 3 mois','API & Webhooks','Analytics équipe','1 meeting MeetMaster/mois']},
    {id:'entreprise',name:'Entreprise',emoji:'🏢',pm:null,pa:null,cr:null, period:'',        hot:false,badge:null,          color:'border-emerald-200',        feats:['Crédits illimités','Utilisateurs illimités','SLA 99.5% garanti','API volume élevé','Onboarding personnalisé','Manager dédié']},
  ]

  return (
    <section ref={sRef} id="pricing" className="py-24 px-5 bg-[#F7F7F5]">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-extrabold text-ink-1 mb-4" style={{fontSize:'clamp(28px,3.5vw,42px)',letterSpacing:'-1.5px',lineHeight:1.15}}>Commencez gratuitement. Évoluez à votre rythme.</h2>
          <p className="text-[16px] text-ink-3 mb-8">Paiement par virement bancaire. TVA 20% incluse. Activation sous 24h.</p>
          <div className="inline-flex items-center gap-0.5 bg-white border border-[rgba(0,0,0,0.08)] rounded-pill p-1.5 shadow-xs">
            {[false,true].map(isAnnual=>(
              <button key={String(isAnnual)} onClick={()=>setAnnual(isAnnual)}
                className={cn('flex items-center gap-2 text-[13px] font-semibold px-5 py-2 rounded-pill transition-all', annual===isAnnual?'bg-ink-1 text-white shadow-xs':'text-ink-3 hover:text-ink-1')}>
                {isAnnual?(<>Annuel <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-pill">-20%</span></>):'Mensuel'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
          {plans.map(plan=>(
            <div key={plan.id} className={cn('reveal-item flex flex-col rounded-2xl border p-6 transition-all duration-300',
              plan.hot?'bg-brand-600 border-brand-500 shadow-[0_8px_40px_rgba(79,70,229,0.25)] lg:scale-[1.04] lg:-translate-y-1':'bg-white hover:shadow-card-md hover:-translate-y-0.5',plan.color)}>
              {plan.badge&&<div className={cn('text-[10px] font-bold uppercase tracking-widest mb-3',plan.hot?'text-brand-200':plan.id==='business'?'text-gold-600':'text-brand-600')}>{plan.id==='business'?'✦':'⭐'} {plan.badge}</div>}
              <div className="flex items-center gap-2 mb-3"><span className="text-[18px]">{plan.emoji}</span><span className={cn('text-[13px] font-bold uppercase tracking-wide',plan.hot?'text-brand-200':'text-ink-3')}>{plan.name}</span></div>
              <div className="mb-4">
                {plan.pm===null?<p className={cn('text-[26px] font-extrabold leading-none',plan.hot?'text-white':'text-ink-1')} style={{letterSpacing:'-1px'}}>Sur devis</p>
                :plan.pm===0?<p className={cn('text-[26px] font-extrabold leading-none',plan.hot?'text-white':'text-ink-1')} style={{letterSpacing:'-1px'}}>Gratuit</p>
                :<div className="flex items-baseline gap-1"><span className={cn('text-[26px] font-extrabold tabular-nums leading-none',plan.hot?'text-white':'text-ink-1')} style={{letterSpacing:'-1px'}}>{annual?plan.pa:plan.pm}</span><span className={cn('text-[12px] font-medium',plan.hot?'text-brand-200':'text-ink-4')}>MAD{plan.period}</span></div>}
                {plan.cr&&<p className={cn('text-[12px] mt-1',plan.hot?'text-brand-200':'text-ink-4')}>{plan.cr.toLocaleString('fr-MA')} crédits{plan.period==='/mois'?'/mois':' offerts'}</p>}
              </div>
              <ul className="space-y-2 flex-1 mb-5">
                {plan.feats.map(f=>(
                  <li key={f} className="flex items-start gap-2">
                    <Check className={cn('w-3.5 h-3.5 mt-0.5 shrink-0',plan.hot?'text-brand-200':'text-emerald-500')} strokeWidth={2.5}/>
                    <span className={cn('text-[12px] leading-snug',plan.hot?'text-brand-100':'text-ink-3')}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href={plan.id==='entreprise'?'mailto:contact@leadmaster.ma':'/register'}
                className={cn('block text-center text-[13px] font-semibold py-2.5 rounded-pill transition-all',
                  plan.hot?'bg-white text-brand-700 hover:bg-brand-50 shadow-sm':plan.id==='decouverte'?'bg-ink-1 text-white hover:bg-ink-2':'bg-[#F0F0ED] text-ink-2 hover:bg-[#E8E8E4] border border-[rgba(0,0,0,0.08)]')}>
                {plan.id==='decouverte'?'Créer un compte':plan.id==='entreprise'?'Nous contacter':`Choisir ${plan.name}`}
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-[12px] text-ink-4 mt-6">Activation manuelle sous 24h · TVA 20% incluse · Paiement par virement bancaire ou chèque</p>
      </div>
    </section>
  )
}

// ─── MeetMaster ────────────────────────────────────────────
function MeetMasterSection() {
  return (
    <section className="py-24 px-5 relative overflow-hidden" style={{background:'linear-gradient(135deg,#fffbeb 0%,#fff7ed 60%,#fef9ee 100%)'}}>
      <div className="absolute right-0 top-0 w-[500px] h-[500px] rounded-full opacity-15 -translate-y-1/2 translate-x-1/4 pointer-events-none" style={{background:'radial-gradient(circle,#F59E0B 0%,transparent 70%)'}} aria-hidden="true"/>
      <div className="max-w-[1000px] mx-auto relative">
        <div className="grid lg:grid-cols-[1fr_auto] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-gold-100 border border-gold-200 rounded-pill px-4 py-2 mb-7">
              <Crown className="w-3.5 h-3.5 text-gold-600"/>
              <span className="text-[11px] font-bold uppercase tracking-widest text-gold-700">MeetMaster by LeadMaster</span>
            </div>
            <h2 className="font-extrabold text-ink-1 mb-5" style={{fontSize:'clamp(26px,3.5vw,44px)',letterSpacing:'-1.5px',lineHeight:1.1}}>
              Rencontrez les décideurs <span className="text-gold-600">qui signent.</span>
            </h2>
            <p className="text-[16px] text-ink-3 leading-relaxed mb-8 max-w-[460px]">
              30 minutes avec un DRH, DAF ou Directeur des Achats qualifié. Insights exclusifs, réseau direct, benchmark de marché. 1 000 MAD le meeting.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/meetmaster" className="btn-gold btn-lg group">Explorer les Masters <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"/></Link>
              <Link href="/meetmaster/apply" className="btn-ghost btn-lg">Devenir Master — 500 MAD/meeting</Link>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 min-w-[220px]">
            {[
              {icon:Search,        title:'Choisissez',body:'Filtrez par rôle, secteur, ville'},
              {icon:CalendarClock, title:'Réservez',  body:'3 créneaux · Réponse sous 24h' },
              {icon:Sparkles,      title:'Rencontrez',body:'30 min de valeur pure en visio' },
            ].map(({icon:Icon,title,body})=>(
              <div key={title} className="flex items-center gap-4 bg-white rounded-xl border border-gold-100 p-4 shadow-xs hover:shadow-sm transition-shadow">
                <div className="w-9 h-9 rounded-lg bg-gold-50 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-gold-600"/></div>
                <div><p className="font-bold text-ink-1 text-[13px]">{title}</p><p className="text-[12px] text-ink-4">{body}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Testimonials ──────────────────────────────────────────
function Testimonials() {
  const sRef = useRef<HTMLElement>(null)
  useReveal(sRef, '.reveal-item')

  const reviews = [
    {quote:'Avant LeadMaster, je passais des journées à chercher des contacts. Maintenant j\'ai une liste qualifiée avec numéros directs en 10 minutes.',             name:'Karim B.', role:'Directeur Commercial · IT, Casablanca', initials:'KB'},
    {quote:'Le système de crédits est brillant — je ne paie que les coordonnées des prospects qui m\'intéressent. Zéro gaspillage. Différent de tous les autres outils.',name:'Nadia A.', role:'Fondatrice · Agence Growth, Rabat',      initials:'NA'},
    {quote:'Les contacts DAF et DRH sont introuvables ailleurs. J\'ai accédé directement à la direction de 8 entreprises cibles en une seule session.',                 name:'Youssef E.',role:'Business Developer · Fintech, Casablanca', initials:'YE'},
  ]

  return (
    <section ref={sRef} className="py-24 px-5 bg-white">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-extrabold text-ink-1" style={{fontSize:'clamp(26px,3.5vw,40px)',letterSpacing:'-1px',lineHeight:1.2}}>Ils ont trouvé leurs prochains clients.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {reviews.map(({quote,name,role,initials})=>(
            <div key={name} className="reveal-item bg-[#FAFAF9] rounded-2xl border border-[rgba(0,0,0,0.06)] p-7 hover:shadow-card-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex gap-0.5 mb-5">{[1,2,3,4,5].map(s=><Star key={s} className="w-4 h-4 fill-gold-400 text-gold-400"/>)}</div>
              <p className="text-[14px] text-ink-2 leading-relaxed mb-6 italic">&ldquo;{quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0"><span className="text-[11px] font-bold text-brand-700">{initials}</span></div>
                <div><p className="font-bold text-ink-1 text-[13px]">{name}</p><p className="text-[11px] text-ink-4 mt-0.5">{role}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FAQ ───────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState<number|null>(null)
  const faqs = [
    {q:"Qu'est-ce qu'un crédit LeadMaster ?",            a:"Un crédit vous permet de débloquer un champ de données pour une entreprise. Voir le numéro de téléphone = 1 crédit, l'e-mail du dirigeant = 5 crédits. Les infos de base (nom, secteur, ville) sont toujours gratuites."},
    {q:"Suis-je facturé deux fois pour le même contact ?",a:"Jamais. Si vous avez déjà débloqué le téléphone d'une entreprise, il s'affiche automatiquement sans crédits lors de vos prochaines recherches. Système anti-double-facturation garanti."},
    {q:"Les données sont-elles fiables ?",               a:"Oui. Sources officielles marocaines, vérifiées régulièrement. 94% des entreprises ont un e-mail valide et 95% un numéro fonctionnel."},
    {q:"Comment fonctionne le paiement ?",               a:"Vous choisissez votre plan, une facture est générée. Vous effectuez un virement bancaire ou remettez un chèque, notre équipe active votre plan sous 24h. TVA 20% incluse."},
    {q:"Puis-je exporter vers mon CRM existant ?",       a:"Oui. Export CSV compatible Excel, HubSpot et Salesforce. Le plan Business inclut aussi un accès API pour intégration directe."},
    {q:"Qu'est-ce que MeetMaster ?",                     a:"MeetMaster est notre marketplace de meetings avec des décideurs marocains — DRH, DAF, Directeurs des Achats. Réservez 30 minutes pour 1 000 MAD."},
  ]
  return (
    <section id="faq" className="py-24 px-5 bg-[#F7F7F5]">
      <div className="max-w-[760px] mx-auto">
        <div className="text-center mb-14"><h2 className="font-extrabold text-ink-1" style={{fontSize:'clamp(26px,3.5vw,40px)',letterSpacing:'-1px',lineHeight:1.2}}>Questions fréquentes</h2></div>
        <div className="space-y-2">
          {faqs.map(({q,a},i)=>(
            <div key={i} className={cn('bg-white rounded-xl border overflow-hidden transition-all duration-200',open===i?'border-brand-200 shadow-[0_2px_12px_rgba(79,70,229,0.07)]':'border-[rgba(0,0,0,0.07)] hover:border-[rgba(0,0,0,0.12)]')}>
              <button onClick={()=>setOpen(open===i?null:i)} className="w-full flex items-center justify-between px-6 py-5 text-left gap-4" aria-expanded={open===i}>
                <span className={cn('font-semibold text-[14.5px] leading-snug',open===i?'text-brand-700':'text-ink-1')} style={{letterSpacing:'-0.2px'}}>{q}</span>
                <ChevronDown className={cn('w-4 h-4 shrink-0 transition-transform duration-200',open===i?'rotate-180 text-brand-500':'text-ink-4')}/>
              </button>
              {open===i&&<div className="px-6 pb-5 animate-reveal-in"><p className="text-[14px] text-ink-3 leading-relaxed">{a}</p></div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Final CTA ─────────────────────────────────────────────
function FinalCTA() {
  const sRef = useRef<HTMLElement>(null)
  useReveal(sRef, '.reveal-item')
  return (
    <section ref={sRef} className="py-28 px-5 bg-white">
      <div className="max-w-[780px] mx-auto text-center">
        <div className="reveal-item inline-flex items-center gap-2 bg-[#F7F7F5] border border-[rgba(0,0,0,0.07)] rounded-pill px-4 py-2 shadow-xs mb-8">
          <Shield className="w-3.5 h-3.5 text-emerald-500"/>
          <span className="text-[12px] font-semibold text-ink-3">Sans engagement · Sans carte bancaire · 100 crédits offerts</span>
        </div>
        <h2 className="reveal-item font-extrabold text-ink-1 mb-5" style={{fontSize:'clamp(34px,5vw,60px)',letterSpacing:'-2.5px',lineHeight:1.05}}>
          Prêt à prospecter<br/><span className="text-brand-600">intelligemment ?</span>
        </h2>
        <p className="reveal-item text-[18px] text-ink-3 mb-10 leading-relaxed max-w-[460px] mx-auto">
          Rejoignez LeadMaster et recevez 100 crédits gratuits pour commencer à prospecter dès aujourd&apos;hui.
        </p>
        <div className="reveal-item flex flex-wrap items-center justify-center gap-4">
          <Link href="/register" className="btn-brand btn-xl group shadow-[0_8px_32px_rgba(79,70,229,0.3)]">
            Créer mon compte gratuitement <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform"/>
          </Link>
          <Link href="/login" className="btn-ghost btn-lg">J&apos;ai déjà un compte</Link>
        </div>
        <p className="reveal-item text-[13px] text-ink-4 mt-5">100 crédits = ~50 numéros de téléphone débloqués</p>
      </div>
    </section>
  )
}

// ─── Footer ────────────────────────────────────────────────
function Footer() {
  const cols = {
    Produit:[{label:'Fonctionnalités',href:'#features'},{label:'Tarification',href:'#pricing'},{label:'MeetMaster',href:'/meetmaster'},{label:'FAQ',href:'#faq'}],
    Compte: [{label:'Se connecter',href:'/login'},{label:'Créer un compte',href:'/register'},{label:'Dashboard',href:'/dashboard'}],
    Contact:[{label:'contact@leadmaster.ma',href:'mailto:contact@leadmaster.ma'},{label:'support@leadmaster.ma',href:'mailto:support@leadmaster.ma'}],
  }
  return (
    <footer className="bg-[#0D1117]">
      <div className="max-w-[1200px] mx-auto px-5 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center"><Target className="w-3.5 h-3.5 text-white"/></div>
              <span className="font-bold text-white text-[15px] tracking-tight">LeadMaster</span>
            </div>
            <p className="text-[13px] text-[rgba(255,255,255,0.35)] leading-relaxed mb-5 max-w-[200px]">La plateforme de prospection B2B pour le marché marocain.</p>
            <div className="flex items-center gap-1.5 text-[11px] text-[rgba(255,255,255,0.3)]"><Globe className="w-3 h-3"/><span>Casablanca · Maroc</span></div>
          </div>
          {Object.entries(cols).map(([col,items])=>(
            <div key={col}>
              <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[rgba(255,255,255,0.25)] mb-5">{col}</p>
              <ul className="space-y-3">{items.map(({label,href})=>(
                <li key={label}><Link href={href} className="text-[13px] text-[rgba(255,255,255,0.4)] hover:text-white transition-colors">{label}</Link></li>
              ))}</ul>
            </div>
          ))}
        </div>
        <div className="border-t border-[rgba(255,255,255,0.05)] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-[rgba(255,255,255,0.18)]">© {new Date().getFullYear()} LeadMaster · Tous droits réservés · Maroc</p>
          <div className="flex items-center gap-6">{['Confidentialité','CGU','Mentions légales'].map(item=>(
            <button key={item} className="text-[12px] text-[rgba(255,255,255,0.2)] hover:text-[rgba(255,255,255,0.5)] transition-colors">{item}</button>
          ))}</div>
        </div>
      </div>
    </footer>
  )
}

// ─── Page Root ─────────────────────────────────────────────
export default function LandingPage() {
  const [showBar, setShowBar] = useState(true)
  return (
    <div className="overflow-x-hidden">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999] bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Aller au contenu principal</a>
      {showBar && <AnnouncementBar onDismiss={()=>setShowBar(false)}/>}
      <Nav hasBar={showBar}/>
      <main id="main">
        <Hero/><DataStrip/><HowItWorks/><Features/><FieldPricing/>
        <Pricing/><MeetMasterSection/><Testimonials/><FAQ/><FinalCTA/>
      </main>
      <Footer/>
    </div>
  )
}
