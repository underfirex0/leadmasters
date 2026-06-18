export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function isAdmin(uid: string) {
  const { data } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', uid).single()
  return data?.is_admin === true
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !(await isAdmin(user.id))) return NextResponse.json({ error: 'Refusé' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const page     = parseInt(searchParams.get('page') || '1')
    const type     = searchParams.get('type') || ''
    const userId   = searchParams.get('user') || ''
    const per      = 50
    const from     = (page - 1) * per

    let q = supabaseAdmin
      .from('crm_activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + per - 1)

    if (type)   q = q.eq('action_type', type)
    if (userId) q = q.eq('user_id', userId)

    const { data: logs, count, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Enrich with user profiles
    const userIds = [...new Set((logs ?? []).map(l => l.user_id))]
    const { data: profiles } = await supabaseAdmin
      .from('profiles').select('id, email, full_name').in('id', userIds)
    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

    const enriched = (logs ?? []).map(l => ({ ...l, profile: profileMap[l.user_id] }))

    return NextResponse.json({ logs: enriched, total: count ?? 0, page, per })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
