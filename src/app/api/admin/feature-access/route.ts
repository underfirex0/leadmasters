import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const VALID_FEATURES = ['search', 'meetmaster', 'crm', 'export', 'data_upload']

export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: me } = await supabaseAdmin
      .from('profiles').select('is_admin').eq('id', session.user.id).single()
    if (!me?.is_admin) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (userId) {
      // Feature access for one user — return empty if table missing
      try {
        const { data } = await supabaseAdmin
          .from('user_feature_access')
          .select('feature, enabled, reason, updated_at')
          .eq('user_id', userId)
        return NextResponse.json({ access: data ?? [] })
      } catch {
        return NextResponse.json({ access: [] })
      }
    }

    // ── Step 1: always fetch profiles (never fails) ──────────
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, plan_id, credit_balance, is_admin, created_at')
      .order('created_at', { ascending: false })
      .limit(300)

    if (profilesError) throw profilesError
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ users: [] })
    }

    // ── Step 2: try feature access — graceful fallback ───────
    let featureMap: Record<string, { feature: string; enabled: boolean; reason: string | null; updated_at: string }[]> = {}
    try {
      const { data: featureRows } = await supabaseAdmin
        .from('user_feature_access')
        .select('user_id, feature, enabled, reason, updated_at')
      if (featureRows) {
        for (const row of featureRows) {
          if (!featureMap[row.user_id]) featureMap[row.user_id] = []
          featureMap[row.user_id].push({ feature: row.feature, enabled: row.enabled, reason: row.reason, updated_at: row.updated_at })
        }
      }
    } catch {
      // Table not created yet — show users with empty feature access
      featureMap = {}
    }

    // ── Step 3: merge ────────────────────────────────────────
    const users = profiles.map(p => ({
      ...p,
      user_feature_access: featureMap[p.id] ?? [],
    }))

    return NextResponse.json({ users })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: me } = await supabaseAdmin
      .from('profiles').select('is_admin').eq('id', session.user.id).single()
    if (!me?.is_admin) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

    const { user_id, feature, enabled, reason } = await req.json()
    if (!user_id || !feature) return NextResponse.json({ error: 'user_id et feature requis' }, { status: 400 })
    if (!VALID_FEATURES.includes(feature)) return NextResponse.json({ error: 'Feature invalide' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('user_feature_access')
      .upsert({
        user_id, feature,
        enabled: enabled ?? true,
        reason:  reason ?? null,
        updated_by: session.user.id,
      }, { onConflict: 'user_id,feature' })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: me } = await supabaseAdmin
      .from('profiles').select('is_admin').eq('id', session.user.id).single()
    if (!me?.is_admin) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

    const { user_id, feature } = await req.json()
    const { error } = await supabaseAdmin
      .from('user_feature_access').delete()
      .eq('user_id', user_id).eq('feature', feature)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}