'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, CreditCard, Database,
  FileText, BarChart2, LogOut, Target, Shield, Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin',                 label: 'Dashboard',        icon: LayoutDashboard, exact: true },
  { href: '/admin/users',           label: 'Utilisateurs',     icon: Users },
  { href: '/admin/subscriptions',   label: 'Abonnements',      icon: CreditCard, badge: 'pending' },
  { href: '/admin/data-requests',   label: 'Imports CSV',      icon: FileText,  badge: 'imports' },
  { href: '/admin/feature-access',  label: 'Accès features',   icon: Shield },
  { href: '/admin/invoices',        label: 'Factures',         icon: FileText },
  { href: '/admin/data',            label: 'Base de données',  icon: Database },
  { href: '/admin/analytics',       label: 'Analytics',        icon: BarChart2 },
  { href: '/admin/logs',            label: 'Logs activité',    icon: Activity },
]

interface AdminNavProps {
  name: string
  email: string
  pendingCount?: number
  importsCount?: number
  onNavigate?: () => void
}

export default function AdminNav({ name, email, pendingCount = 0, importsCount = 0, onNavigate }: AdminNavProps) {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-[rgba(0,0,0,0.05)] shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2 mb-2 group">
          <div className="w-7 h-7 bg-brand-600 rounded-[8px] flex items-center justify-center group-hover:bg-brand-700 transition-colors">
            <Target className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-ink-1 text-[14px] tracking-tight">LeadMaster</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-brand-600" />
          <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">Admin Panel</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact, badge }) => {
          const active = isActive(href, exact)
          const badgeCount = badge === 'pending' ? pendingCount : badge === 'imports' ? importsCount : 0
          return (
            <Link key={href} href={href} onClick={onNavigate}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-[9px] text-[13px] font-medium transition-all group',
                active ? 'bg-brand-50 text-brand-700' : 'text-ink-3 hover:text-ink-1 hover:bg-surface-2'
              )}>
              <div className="flex items-center gap-2.5">
                <Icon className={cn('w-4 h-4', active ? 'text-brand-600' : 'text-ink-4 group-hover:text-ink-2')} />
                {label}
              </div>
              {badgeCount > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-[rgba(0,0,0,0.05)] shrink-0 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-brand-700 font-bold text-[11px]">{(name || email || 'A')[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-ink-1 truncate">{name || 'Admin'}</p>
            <p className="text-[10px] text-ink-4 truncate">{email}</p>
          </div>
        </div>
        <Link href="/dashboard" onClick={onNavigate}
          className="flex items-center gap-2 text-[12px] text-ink-4 hover:text-ink-1 transition-colors">
          <LogOut className="w-3.5 h-3.5" /> Retour à l&apos;app
        </Link>
      </div>
    </>
  )
}
