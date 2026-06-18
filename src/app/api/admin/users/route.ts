export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function isAdmin(userId: string) {
  const { data } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', userId).single()
  return data?.is_admin === true
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !(await isAdmin(user.id))) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const search  = searchParams.get('search') || ''
    const planId  = searchParams.get('plan') || ''
    const page    = parseInt(searchParams.get('page') || '1')
    const perPage = 20
    const from    = (page - 1) * perPage
    const to      = from + perPage - 1

    let query = supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, plan_id, credit_balance, is_admin, created_at, referral_code', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (search)  query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
    if (planId)  query = query.eq('plan_id', planId)

    const { data: users, count, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Get subscriptions for these users
    const userIds = (users ?? []).map(u => u.id)
    const { data: subs } = await supabaseAdmin
      .from('subscriptions').select('user_id, status, plan_id, current_period_end, billing_cycle')
      .in('user_id', userIds).in('status', ['active','pending'])

    const subMap = Object.fromEntries((subs ?? []).map(s => [s.user_id, s]))
    const enriched = (users ?? []).map(u => ({ ...u, subscription: subMap[u.id] || null }))

    return NextResponse.json({ users: enriched, total: count ?? 0, page, per_page: perPage })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
