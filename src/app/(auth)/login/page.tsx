'use client'
import { useState, FormEvent, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, Loader2, Target, ArrowRight } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message)
      setLoading(false)
    } else {
      router.push(redirectTo); router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-[10px] p-3.5 text-[13px] text-red-600">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}
      <div>
        <label className="label text-[13px]">Adresse e-mail</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          className="input" placeholder="vous@exemple.com" required autoComplete="email" />
      </div>
      <div>
        <label className="label text-[13px]">Mot de passe</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          className="input" placeholder="••••••••" required autoComplete="current-password" />
      </div>
      <button type="submit" disabled={loading}
        className="btn-primary w-full justify-center py-2.5 text-[14px] mt-2">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Connexion…</> : <>Se connecter <ArrowRight className="w-4 h-4" /></>}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-surface-1 flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-8 h-8 bg-brand-600 rounded-[9px] flex items-center justify-center group-hover:bg-brand-700 transition-colors shadow-sm">
              <Target className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-ink-1 text-[16px] tracking-tight">LeadScout</span>
          </Link>
          <h1 className="font-bold text-ink-1 mb-2" style={{ fontSize: '24px', letterSpacing: '-0.5px' }}>Bon retour 👋</h1>
          <p className="text-[14px] text-ink-3">
            Pas encore inscrit ?{' '}
            <Link href="/register" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">Créer un compte</Link>
          </p>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[20px] p-7 shadow-card">
          <Suspense fallback={<div className="h-48 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-ink-4" /></div>}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="text-center text-[12px] text-ink-4 mt-6">
          <Link href="/" className="hover:text-ink-2 transition-colors">← Retour à l&apos;accueil</Link>
        </p>
      </div>
    </div>
  )
}
