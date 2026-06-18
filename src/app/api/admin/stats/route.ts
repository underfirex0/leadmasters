export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', userId).single()
  return data?.is_admin === true
}

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !(await isAdmin(user.id)))
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const [
      { count: totalUsers },
      { data: profiles },
      { data: subscriptions },
      { data: invoices },
      { data: recentUsers },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('profiles').select('plan_id'),
      supabaseAdmin.from('subscriptions').select('plan_id, billing_cycle, status').eq('status', 'active'),
      supabaseAdmin.from('invoices').select('amount_ht, total_ttc, status, type, created_at, plan_id'),
      supabaseAdmin.from('profiles').select('id, email, full_name, plan_id, credit_balance, created_at')
        .order('created_at', { ascending: false }).limit(10),
    ])

    // Plan distribution
    const planDist: Record<string, number> = {}
    for (const p of (profiles ?? [])) {
      planDist[p.plan_id ?? 'decouverte'] = (planDist[p.plan_id ?? 'decouverte'] || 0) + 1
    }

    // MRR from active subscriptions
    const PLAN_PRICES: Record<string, Record<string, number>> = {
      solo:     { monthly: 149, annual: 119 },
      equipe:   { monthly: 390, annual: 299 },
      business: { monthly: 990, annual: 790 },
    }
    let mrr = 0
    for (const sub of (subscriptions ?? [])) {
      const prices = PLAN_PRICES[sub.plan_id]
      if (prices) mrr += prices[sub.billing_cycle] ?? 0
    }

    // Revenue from paid invoices
    const paidInvoices = (invoices ?? []).filter(i => i.status === 'paid')
    const totalRevenue = paidInvoices.reduce((s, i) => s + (i.total_ttc || 0), 0)
    const topupRevenue = paidInvoices.filter(i => i.type === 'topup').reduce((s, i) => s + (i.total_ttc || 0), 0)
    const subRevenue   = paidInvoices.filter(i => i.type === 'subscription').reduce((s, i) => s + (i.total_ttc || 0), 0)

    // Pending invoices
    const pendingInvoices = (invoices ?? []).filter(i => i.status === 'pending')
    const pendingAmount = pendingInvoices.reduce((s, i) => s + (i.total_ttc || 0), 0)

    return NextResponse.json({
      total_users:      totalUsers ?? 0,
      active_subs:      subscriptions?.length ?? 0,
      mrr,
      arr:              mrr * 12,
      total_revenue:    totalRevenue,
      topup_revenue:    topupRevenue,
      sub_revenue:      subRevenue,
      pending_amount:   pendingAmount,
      pending_count:    pendingInvoices.length,
      plan_distribution: planDist,
      recent_users:     recentUsers ?? [],
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
