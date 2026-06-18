'use client'
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'info' | 'warning'
type Toast = { id: string; message: string; type: ToastType }
type ToastCtx = { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void; warning: (m: string) => void }

const ToastContext = createContext<ToastCtx>({ success:()=>{}, error:()=>{}, info:()=>{}, warning:()=>{} })
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts(p => [...p.slice(-4), { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500)
  }, [])
  return (
    <ToastContext.Provider value={{ success: m => push(m,'success'), error: m => push(m,'error'), info: m => push(m,'info'), warning: m => push(m,'warning') }}>
      {children}
      <div aria-live="polite" className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={id => setToasts(p => p.filter(x => x.id !== id))} />)}
      </div>
    </ToastContext.Provider>
  )
}

const CFG = {
  success: { bg: 'bg-white border-emerald-100',  text: 'text-ink-1', sub: 'text-emerald-600', icon: CheckCircle, bar: 'bg-emerald-500' },
  error:   { bg: 'bg-white border-red-100',       text: 'text-ink-1', sub: 'text-red-500',     icon: XCircle,     bar: 'bg-red-500' },
  info:    { bg: 'bg-white border-brand-100',     text: 'text-ink-1', sub: 'text-brand-600',   icon: Info,        bar: 'bg-brand-500' },
  warning: { bg: 'bg-white border-gold-100',      text: 'text-ink-1', sub: 'text-gold-600',    icon: AlertTriangle,bar: 'bg-gold-500' },
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const cfg = CFG[toast.type]
  const Icon = cfg.icon
  const [vis, setVis] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setVis(true)) }, [])
  return (
    <div className={cn(
      'pointer-events-auto relative overflow-hidden flex items-start gap-3 w-[320px] rounded-[14px] border px-4 py-3.5',
      'shadow-[0_4px_24px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.04)]',
      'transition-all duration-300',
      cfg.bg, vis ? 'translate-x-0 opacity-100' : 'translate-x-3 opacity-0'
    )}>
      <div className="absolute bottom-0 left-0 h-0.5 w-full overflow-hidden rounded-b-[14px]">
        <div className={cn('h-full', cfg.bar)} style={{ animation: 'toast-progress 4.5s linear forwards' }} />
      </div>
      <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', cfg.sub)} />
      <p className={cn('text-[13px] font-medium flex-1 leading-snug', cfg.text)}>{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} className="text-ink-4 hover:text-ink-1 transition-colors mt-0.5">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
