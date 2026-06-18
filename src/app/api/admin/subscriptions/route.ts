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
    const status = searchParams.get('status') || ''
    const page   = parseInt(searchParams.get('page') || '1')
    const per    = 25
    const from   = (page - 1) * per

    let q = supabaseAdmin
      .from('subscriptions')
      .select('*, plan:plans(name, price_monthly, credits_per_month)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + per - 1)

    if (status) q = q.eq('status', status)

    const { data: subs, count, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Enrich with user profile
    const userIds = [...new Set((subs ?? []).map(s => s.user_id))]
    const { data: profiles } = await supabaseAdmin
      .from('profiles').select('id, email, full_name, credit_balance').in('id', userIds)
    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
    const enriched = (subs ?? []).map(s => ({ ...s, profile: profileMap[s.user_id] }))

    // Summary counts
    const [
      { count: pendingCount },
      { count: activeCount },
      { count: cancelledCount },
    ] = await Promise.all([
      supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    ])

    return NextResponse.json({
      subscriptions: enriched,
      total: count ?? 0,
      page, per,
      summary: { pending: pendingCount ?? 0, active: activeCount ?? 0, cancelled: cancelledCount ?? 0 },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
