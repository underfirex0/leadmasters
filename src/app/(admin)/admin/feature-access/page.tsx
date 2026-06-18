'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, RefreshCw, Shield, ShieldOff, ShieldCheck, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeatureAccess { feature: string; enabled: boolean; reason: string | null; updated_at: string }
interface UserWithAccess {
  id: string; email: string; full_name: string | null; plan_id: string | null
  credit_balance: number; is_admin: boolean
  user_feature_access: FeatureAccess[]
}

const FEATURES: { key: string; label: string; desc: string }[] = [
  { key: 'search',      label: 'Recherche',       desc: 'Lancer des recherches d\'entreprises' },
  { key: 'meetmaster',  label: 'MeetMaster',       desc: 'Accéder au répertoire MeetMaster' },
  { key: 'crm',         label: 'CRM',              desc: 'Gérer le pipeline CRM' },
  { key: 'export',      label: 'Export CSV',       desc: 'Exporter les données en CSV' },
  { key: 'data_upload', label: 'Import données',   desc: 'Uploader des CSV pour import CRM' },
]

const PLAN_LABELS: Record<string, string> = { decouverte: '🌱', solo: '⚡ Solo', equipe: '👥 Équipe', business: '🚀 Business', entreprise: '🏢 Ent.' }

function FeatureToggle({
  userId, feature, enabled, onToggle, loading
}: { userId: string; feature: string; enabled: boolean; onToggle: (userId: string, feature: string, enabled: boolean) => void; loading: boolean }) {
  return (
    <button
      onClick={() => onToggle(userId, feature, !enabled)}
      disabled={loading}
      className={cn(
        'relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-400',
        enabled ? 'bg-brand-600' : 'bg-[rgba(0,0,0,0.15)]',
        loading && 'opacity-50 cursor-not-allowed'
      )}
      aria-label={enabled ? 'Désactiver' : 'Activer'}
    >
      <span className={cn(
        'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200',
        enabled ? 'translate-x-5' : 'translate-x-0'
      )} />
    </button>
  )
}

export default function AdminFeatureAccessPage() {
  const [users, setUsers]           = useState<UserWithAccess[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [toggling, setToggling]     = useState<Record<string, boolean>>({})
  const [reasonDraft, setReasonDraft] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/feature-access')
    if (res.ok) { const d = await res.json(); setUsers(d.users ?? []) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Get effective feature enabled state (override > default true)
  function isEnabled(user: UserWithAccess, featureKey: string): boolean {
    const override = user.user_feature_access?.find(f => f.feature === featureKey)
    return override ? override.enabled : true // default: all enabled
  }

  function hasOverride(user: UserWithAccess, featureKey: string): boolean {
    return !!user.user_feature_access?.find(f => f.feature === featureKey)
  }

  async function toggleFeature(userId: string, feature: string, enabled: boolean) {
    const key = `${userId}_${feature}`
    setToggling(p => ({ ...p, [key]: true }))
    await fetch('/api/admin/feature-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, feature, enabled, reason: reasonDraft[key] || null }),
    })
    setToggling(p => ({ ...p, [key]: false }))
    await load()
  }

  async function removeOverride(userId: string, feature: string) {
    const key = `${userId}_${feature}`
    setToggling(p => ({ ...p, [key]: true }))
    await fetch('/api/admin/feature-access', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, feature }),
    })
    setToggling(p => ({ ...p, [key]: false }))
    await load()
  }

  const filtered = users.filter(u =>
    !u.is_admin &&
    (search === '' ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-ink-1 mb-1" style={{ letterSpacing: '-0.6px' }}>Accès features</h1>
          <p className="text-[13px] text-ink-3">Contrôlez quelles sections chaque client peut voir, indépendamment de son plan.</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 text-[13px] font-medium text-ink-3 hover:text-ink-1 transition-colors py-2 px-3 rounded-lg hover:bg-surface-2">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Actualiser
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-4 bg-brand-50 border border-brand-100 rounded-xl text-[12px] text-brand-800">
        <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" /> <span><strong>Vert activé</strong> = accès normal (défaut)</span></div>
        <div className="flex items-center gap-2"><ShieldOff className="w-4 h-4 text-red-500" /> <span><strong>Gris désactivé</strong> = bloqué par override admin</span></div>
        <div className="flex items-center gap-2"><Info className="w-4 h-4 text-brand-600" /> <span>Sans override = toutes les features activées par défaut</span></div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un client par email ou nom…"
          className="w-full pl-11 pr-4 py-3 border border-[rgba(0,0,0,0.1)] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400" />
      </div>

      {/* Users list */}
      {loading ? (
        <div className="text-center py-16"><Loader2 className="w-5 h-5 animate-spin text-ink-4 mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] p-10 text-center">
          <p className="text-[14px] text-ink-4">Aucun utilisateur trouvé</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(user => {
            const isExpanded  = expandedId === user.id
            const overrides   = user.user_feature_access?.length ?? 0
            const blocked     = user.user_feature_access?.filter(f => !f.enabled).length ?? 0
            const plan        = PLAN_LABELS[user.plan_id ?? ''] ?? '🌱'

            return (
              <div key={user.id} className="bg-white rounded-2xl border border-[rgba(0,0,0,0.07)] overflow-hidden">
                {/* Row */}
                <button onClick={() => setExpandedId(isExpanded ? null : user.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-surface-1 transition-colors">
                  <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-[13px] font-bold text-brand-700">{(user.full_name || user.email)[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-ink-1 truncate">{user.full_name || user.email}</p>
                      <span className="text-[10px] text-ink-4 shrink-0">{plan}</span>
                    </div>
                    <p className="text-[11px] text-ink-4 truncate">{user.email}</p>
                  </div>

                  {/* Feature quick summary */}
                  <div className="hidden sm:flex items-center gap-1">
                    {FEATURES.map(f => {
                      const on = isEnabled(user, f.key)
                      const override = hasOverride(user, f.key)
                      return (
                        <div key={f.key} title={`${f.label}: ${on ? 'activé' : 'bloqué'}${override ? ' (override)' : ''}`}
                          className={cn('w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold border',
                            on ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-500 border-red-100',
                            override && 'ring-2 ring-offset-1 ring-brand-400')}>
                          {f.key[0].toUpperCase()}
                        </div>
                      )
                    })}
                  </div>

                  {blocked > 0 && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-pill shrink-0">
                      <ShieldOff className="w-3 h-3" />{blocked} bloqué{blocked > 1 ? 's' : ''}
                    </span>
                  )}
                  {overrides === 0 && (
                    <span className="text-[11px] text-ink-4 italic shrink-0">Aucun override</span>
                  )}

                  {isExpanded ? <ChevronUp className="w-4 h-4 text-ink-4 shrink-0" /> : <ChevronDown className="w-4 h-4 text-ink-4 shrink-0" />}
                </button>

                {/* Feature controls */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-[rgba(0,0,0,0.05)] space-y-3">
                    {FEATURES.map(f => {
                      const on       = isEnabled(user, f.key)
                      const override = hasOverride(user, f.key)
                      const tKey     = `${user.id}_${f.key}`
                      const isLoading = toggling[tKey]

                      return (
                        <div key={f.key} className={cn(
                          'flex items-center gap-4 p-4 rounded-xl border transition-colors',
                          on ? 'border-[rgba(0,0,0,0.06)] bg-white' : 'border-red-100 bg-red-50/40',
                          override && 'ring-1 ring-brand-200'
                        )}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[13px] text-ink-1">{f.label}</span>
                              {override && (
                                <span className="text-[9px] font-bold uppercase tracking-wide text-brand-600 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded">Override</span>
                              )}
                              {!override && (
                                <span className="text-[9px] text-ink-4 italic">Défaut (activé)</span>
                              )}
                            </div>
                            <p className="text-[12px] text-ink-4">{f.desc}</p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <FeatureToggle userId={user.id} feature={f.key} enabled={on} onToggle={toggleFeature} loading={isLoading} />
                            <span className={cn('text-[11px] font-semibold min-w-[50px]', on ? 'text-emerald-600' : 'text-red-500')}>
                              {on ? 'Activé' : 'Bloqué'}
                            </span>
                            {override && (
                              <button onClick={() => removeOverride(user.id, f.key)} disabled={isLoading}
                                className="text-[11px] text-ink-4 hover:text-ink-1 underline transition-colors">
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Block all / Allow all quick actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-ink-4">Actions rapides:</span>
                      <button onClick={async () => {
                        for (const f of FEATURES) await toggleFeature(user.id, f.key, true)
                      }} className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Tout activer
                      </button>
                      <span className="text-ink-5">·</span>
                      <button onClick={async () => {
                        for (const f of FEATURES) await toggleFeature(user.id, f.key, false)
                      }} className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1">
                        <ShieldOff className="w-3 h-3" /> Tout bloquer
                      </button>
                      <span className="text-ink-5">·</span>
                      <button onClick={async () => {
                        for (const f of FEATURES) await removeOverride(user.id, f.key)
                      }} className="text-[11px] font-semibold text-ink-3 hover:text-ink-1 transition-colors flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Supprimer tous les overrides
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
