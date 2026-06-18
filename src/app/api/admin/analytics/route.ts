export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function isAdmin(uid: string) {
  const { data } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', uid).single()
  return data?.is_admin === true
}

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !(await isAdmin(user.id))) return NextResponse.json({ error: 'Refusé' }, { status: 403 })

    const [
      { data: creditTx },
      { data: queries },
      { data: unlocks },
      { data: topProfiles },
    ] = await Promise.all([
      supabaseAdmin.from('credit_transactions').select('amount, type'),
      supabaseAdmin.from('queries').select('user_id, credits_spent'),
      supabaseAdmin.from('unlock_events').select('field, credits_spent'),
      supabaseAdmin.from('profiles').select('id, email, full_name, plan_id, credit_balance').order('credit_balance', { ascending: false }).limit(20),
    ])

    const totalGranted = (creditTx ?? []).filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
    const totalSpent   = Math.abs((creditTx ?? []).filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0))

    // Per-field unlock counts
    const byField: Record<string, number> = {}
    for (const u of unlocks ?? []) byField[u.field] = (byField[u.field] || 0) + 1

    // Top users: enrich with query count and credits spent
    const queryByUser: Record<string, { count: number; spent: number }> = {}
    for (const q of queries ?? []) {
      if (!queryByUser[q.user_id]) queryByUser[q.user_id] = { count: 0, spent: 0 }
      queryByUser[q.user_id].count++
      queryByUser[q.user_id].spent += q.credits_spent ?? 0
    }

    const topUsers = (topProfiles ?? [])
      .map(p => ({ ...p, query_count: queryByUser[p.id]?.count ?? 0, credits_spent: queryByUser[p.id]?.spent ?? 0 }))
      .sort((a, b) => b.credits_spent - a.credits_spent)
      .slice(0, 15)

    return NextResponse.json({
      credit_stats:  { total_granted: totalGranted, total_spent: totalSpent },
      query_stats:   { total: queries?.length ?? 0 },
      unlock_stats:  { total: unlocks?.length ?? 0, by_field: byField },
      top_users:     topUsers,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
