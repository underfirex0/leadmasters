import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const VALID_FEATURES = ['search', 'meetmaster', 'crm', 'export', 'data_upload']

// GET /api/admin/feature-access?userId=xxx — get feature access for a user
// GET /api/admin/feature-access — get all users with their access
export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: me } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', session.user.id).single()
    if (!me?.is_admin) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (userId) {
      // Get feature access for a specific user
      const { data, error } = await supabaseAdmin
        .from('user_feature_access')
        .select('feature, enabled, reason, updated_at')
        .eq('user_id', userId)
      if (error) throw error
      return NextResponse.json({ access: data })
    }

    // Get all users with their feature access overrides
    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id, email, full_name, plan_id, credit_balance, is_admin,
        user_feature_access (feature, enabled, reason, updated_at)
      `)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw error

    return NextResponse.json({ users })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/admin/feature-access — upsert feature access for a user
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: me } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', session.user.id).single()
    if (!me?.is_admin) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

    const { user_id, feature, enabled, reason } = await req.json()

    if (!user_id || !feature) return NextResponse.json({ error: 'user_id et feature requis' }, { status: 400 })
    if (!VALID_FEATURES.includes(feature)) return NextResponse.json({ error: 'Feature invalide' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('user_feature_access')
      .upsert({
        user_id,
        feature,
        enabled: enabled ?? true,
        reason:  reason ?? null,
        updated_by: session.user.id,
      }, { onConflict: 'user_id,feature' })

    if (error) throw error

    // Log
    await supabaseAdmin.from('activity_logs').insert({
      user_id: session.user.id,
      action:  'feature_access_update',
      details: { target_user: user_id, feature, enabled },
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/admin/feature-access — remove override (reverts to plan default)
export async function DELETE(req: Request) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: me } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', session.user.id).single()
    if (!me?.is_admin) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

    const { user_id, feature } = await req.json()
    const { error } = await supabaseAdmin
      .from('user_feature_access')
      .delete()
      .eq('user_id', user_id)
      .eq('feature', feature)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}
