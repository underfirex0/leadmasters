'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, Plus, Mail, Crown, Shield, User, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function TeamPage() {
  const [planId, setPlanId] = useState('decouverte')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/subscription').then(r => r.json()).then(d => {
      setPlanId((d.profile?.plan_id as string) ?? 'decouverte')
    }).finally(() => setLoading(false))
  }, [])

  const MAX_USERS: Record<string, number | null> = { decouverte: 1, solo: 1, equipe: 3, business: 10, entreprise: null }
  const maxUsers = MAX_USERS[planId]
  const canAddMembers = planId === 'equipe' || planId === 'business' || planId === 'entreprise'

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-reveal-in">
      <div className="flex items-center gap-3">
        <Link href="/account" className="btn-ghost text-sm"><ArrowLeft className="w-4 h-4" /> Retour</Link>
      </div>
      <div>
        <h1 className="font-bold text-ink-1" style={{ fontSize: '26px', letterSpacing: '-0.8px' }}>Mon équipe</h1>
        <p className="text-[14px] text-ink-3 mt-1">Gérez les membres de votre organisation.</p>
      </div>

      {!canAddMembers ? (
        <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[20px] p-10 shadow-card text-center">
          <Users className="w-12 h-12 text-ink-5 mx-auto mb-4" />
          <h3 className="font-bold text-[18px] text-ink-1 mb-2" style={{ letterSpacing: '-0.5px' }}>
            Multi-utilisateurs non disponible
          </h3>
          <p className="text-[14px] text-ink-3 mb-6 max-w-sm mx-auto">
            Les plans Équipe et Business permettent d&apos;inviter jusqu&apos;à 3 ou 10 collaborateurs qui partagent vos crédits.
          </p>
          <Link href="/account/plan" className="btn-brand">
            Passer au plan Équipe →
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[20px] p-6 shadow-card">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-[15px] text-ink-1">Membres de l&apos;équipe</h3>
                <p className="text-[12px] text-ink-3 mt-0.5">
                  {maxUsers ? `1/${maxUsers} membres` : 'Illimité'}
                </p>
              </div>
              <button className="btn-brand text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> Inviter
              </button>
            </div>

            {/* Owner row */}
            <div className="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
                  <Crown className="w-4 h-4 text-brand-600" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-ink-1">Vous (propriétaire)</p>
                  <p className="text-[11px] text-ink-4">Accès complet</p>
                </div>
              </div>
              <span className="badge badge-brand text-[11px]"><Crown className="w-3 h-3" /> Propriétaire</span>
            </div>

            <p className="text-[13px] text-ink-3 text-center py-8">
              Aucun autre membre pour l&apos;instant.{' '}
              <button className="text-brand-600 font-semibold hover:underline">Inviter par email →</button>
            </p>
          </div>

          <div className="bg-surface-1 border border-[rgba(0,0,0,0.06)] rounded-[16px] p-5 text-[13px] text-ink-3">
            <p className="font-semibold text-ink-2 mb-2">À propos des équipes</p>
            <ul className="space-y-1.5 text-[12px]">
              <li className="flex items-start gap-2"><Shield className="w-3.5 h-3.5 text-brand-500 mt-0.5 shrink-0" />Tous les membres partagent le pool de crédits de l&apos;organisation.</li>
              <li className="flex items-start gap-2"><User className="w-3.5 h-3.5 text-brand-500 mt-0.5 shrink-0" />Les admins peuvent gérer les membres et voir les analytics.</li>
              <li className="flex items-start gap-2"><Mail className="w-3.5 h-3.5 text-brand-500 mt-0.5 shrink-0" />L&apos;invitation se fait par email — l&apos;invité reçoit un lien d&apos;accès.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
