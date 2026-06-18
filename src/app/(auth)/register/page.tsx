'use client'
import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, Loader2, CheckCircle, Target, ArrowRight, Check } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError(null)
    if (password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); setLoading(false); return }
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
    if (error) { setError(error.message.includes('already registered') ? 'Cet e-mail est déjà utilisé.' : error.message); setLoading(false); return }
    const { error: e2 } = await supabase.auth.signInWithPassword({ email, password })
    if (!e2) { router.push('/dashboard'); router.refresh() } else { setDone(true); setLoading(false) }
  }

  if (done) return (
    <div className="min-h-screen bg-surface-1 flex items-center justify-center px-5">
      <div className="max-w-[400px] w-full text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="font-bold text-ink-1 mb-2 text-xl">Vérifiez votre e-mail !</h2>
        <p className="text-[14px] text-ink-3 mb-6">Un lien de confirmation a été envoyé à <strong>{email}</strong>.</p>
        <Link href="/login" className="btn-primary justify-center w-full">Retour à la connexion</Link>
      </div>
    </div>
  )

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
          <h1 className="font-bold text-ink-1 mb-2" style={{ fontSize: '24px', letterSpacing: '-0.5px' }}>Créer un compte</h1>
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-pill px-3 py-1.5 text-[12px] font-semibold text-emerald-700 mb-1">
            <Check className="w-3 h-3" strokeWidth={2.5} /> 100 crédits offerts à l&apos;inscription
          </div>
          <p className="text-[13px] text-ink-3 mt-2">
            Déjà inscrit ?{' '}
            <Link href="/login" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">Se connecter</Link>
          </p>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[20px] p-7 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-[10px] p-3.5 text-[13px] text-red-600">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
              </div>
            )}
            <div>
              <label className="label text-[13px]">Nom complet</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                className="input" placeholder="Votre nom et prénom" required autoComplete="name" />
            </div>
            <div>
              <label className="label text-[13px]">Adresse e-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input" placeholder="vous@exemple.com" required autoComplete="email" />
            </div>
            <div>
              <label className="label text-[13px]">Mot de passe <span className="text-ink-4 font-normal">(min. 6 caractères)</span></label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input" placeholder="••••••••" required minLength={6} autoComplete="new-password" />
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-2.5 text-[14px] mt-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Création…</> : <>Créer mon compte <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>
        <p className="text-center text-[12px] text-ink-4 mt-6">
          <Link href="/" className="hover:text-ink-2 transition-colors">← Retour à l&apos;accueil</Link>
        </p>
      </div>
    </div>
  )
}
