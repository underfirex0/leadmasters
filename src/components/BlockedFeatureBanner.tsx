'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { ShieldOff, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const FEATURE_LABELS: Record<string, string> = {
  search:       'Recherche',
  meetmaster:   'MeetMaster',
  crm:          'CRM',
  export:       'Export CSV',
  data_upload:  'Import de données',
}

export default function BlockedFeatureBanner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [feature, setFeature] = useState<string | null>(null)

  useEffect(() => {
    const blocked = searchParams.get('blocked')
    if (blocked) {
      setFeature(blocked)
      setVisible(true)
    }
  }, [searchParams])

  if (!visible || !feature) return null

  const label = FEATURE_LABELS[feature] ?? feature

  function dismiss() {
    setVisible(false)
    router.replace('/dashboard')
  }

  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6 animate-reveal-in">
      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
        <ShieldOff className="w-4 h-4 text-red-600" />
      </div>
      <p className="text-[13px] text-red-700 flex-1">
        Votre accès à <strong>{label}</strong> a été désactivé sur ce compte. Contactez le support si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
      </p>
      <button onClick={dismiss} className="text-red-400 hover:text-red-600 transition-colors shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
