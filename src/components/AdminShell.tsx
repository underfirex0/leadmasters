'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import AdminNav from './AdminNav'

interface AdminShellProps {
  name: string
  email: string
  pendingCount: number
  importsCount: number
  children: React.ReactNode
}

export default function AdminShell({ name, email, pendingCount, importsCount, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setMobileOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <div className="min-h-screen bg-surface-1 flex">
      {/* Desktop sidebar — always visible at lg+ */}
      <aside className="hidden lg:flex w-56 bg-white border-r border-[rgba(0,0,0,0.06)] flex-col sticky top-0 h-screen overflow-hidden shrink-0">
        <AdminNav name={name} email={email} pendingCount={pendingCount} importsCount={importsCount} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[60] lg:hidden animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed top-0 left-0 bottom-0 w-[78vw] max-w-[280px] bg-white z-[70] lg:hidden flex flex-col shadow-floating animate-slide-in-left">
            <AdminNav
              name={name} email={email}
              pendingCount={pendingCount} importsCount={importsCount}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </>
      )}

      <main className="flex-1 min-w-0 overflow-auto">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-[rgba(0,0,0,0.06)] px-4 h-14 flex items-center justify-between">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-surface-2 transition-colors" aria-label="Ouvrir le menu admin">
            <Menu className="w-5 h-5 text-ink-2" />
          </button>
          <span className="text-[13px] font-bold text-ink-1">Admin Panel</span>
          <div className="w-9" /> {/* spacer to center title */}
        </div>

        <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
