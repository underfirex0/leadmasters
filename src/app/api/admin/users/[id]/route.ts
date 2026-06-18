export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Params = { params: { id: string } }

async function isAdmin(userId: string) {
  const { data } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', userId).single()
  return data?.is_admin === true
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !(await isAdmin(user.id))) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const [
      { data: profile },
      { data: subscription },
      { data: transactions },
      { data: invoices },
      { data: queries },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', params.id).single(),
      supabaseAdmin.from('subscriptions').select('*, plan:plans(*)').eq('user_id', params.id).single(),
      supabaseAdmin.from('credit_transactions').select('*').eq('user_id', params.id).order('created_at', { ascending: false }).limit(20),
      supabaseAdmin.from('invoices').select('*').eq('user_id', params.id).order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('queries').select('id, created_at, credits_spent, result_count, filters').eq('user_id', params.id).order('created_at', { ascending: false }).limit(10),
    ])

    return NextResponse.json({ profile, subscription, transactions, invoices, queries })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !(await isAdmin(user.id))) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const body = await request.json()
    const { action } = body

    switch (action) {
      // ── Activate subscription ──────────────────────────────
      case 'activate_plan': {
        const { plan_id, billing_cycle = 'monthly', notes = '' } = body
        const { data: plan } = await supabaseAdmin.from('plans').select('*').eq('id', plan_id).single()
        if (!plan) return NextResponse.json({ error: 'Plan introuvable' }, { status: 404 })

        const periodEnd = billing_cycle === 'annual'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 30  * 24 * 60 * 60 * 1000).toISOString()

        // Upsert subscription
        const { data: existing } = await supabaseAdmin.from('subscriptions').select('id').eq('user_id', params.id).single()
        if (existing) {
          await supabaseAdmin.from('subscriptions').update({
            plan_id, billing_cycle, status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd,
            activated_at: new Date().toISOString(),
            notes, updated_at: new Date().toISOString(),
          }).eq('id', existing.id)
        } else {
          await supabaseAdmin.from('subscriptions').insert({
            user_id: params.id, plan_id, billing_cycle, status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd,
            activated_at: new Date().toISOString(), notes,
          })
        }

        // Update profile plan + add credits
        const { data: profile } = await supabaseAdmin.from('profiles').select('credit_balance').eq('id', params.id).single()
        const newBalance = (profile?.credit_balance ?? 0) + (plan.credits_per_month ?? 0)
        await supabaseAdmin.from('profiles').update({ plan_id }).eq('id', params.id)
        if (plan.credits_per_month) {
          await supabaseAdmin.from('profiles').update({ credit_balance: newBalance }).eq('id', params.id)
          await supabaseAdmin.from('credit_transactions').insert({
            user_id: params.id, amount: plan.credits_per_month, balance_after: newBalance,
            type: 'grant', description: `Activation plan ${plan.name} — ${plan.credits_per_month} crédits`,
          })
        }

        // Mark pending invoice as paid
        await supabaseAdmin.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('user_id', params.id).eq('status', 'pending').eq('type', 'subscription')

        return NextResponse.json({ message: `Plan ${plan.name} activé`, plan_id, period_end: periodEnd })
      }

      // ── Manual credit top-up ───────────────────────────────
      case 'add_credits': {
        const { amount, reason = 'Crédit manuel admin' } = body
        if (!amount || amount <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })

        const { data: profile } = await supabaseAdmin.from('profiles').select('credit_balance').eq('id', params.id).single()
        const newBalance = (profile?.credit_balance ?? 0) + amount
        await supabaseAdmin.from('profiles').update({ credit_balance: newBalance }).eq('id', params.id)
        await supabaseAdmin.from('credit_transactions').insert({
          user_id: params.id, amount, balance_after: newBalance, type: 'grant', description: reason,
        })

        return NextResponse.json({ message: `${amount} crédits ajoutés`, new_balance: newBalance })
      }

      // ── Cancel subscription ────────────────────────────────
      case 'cancel_subscription': {
        await supabaseAdmin.from('subscriptions').update({
          status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq('user_id', params.id).in('status', ['active','pending'])
        await supabaseAdmin.from('profiles').update({ plan_id: 'decouverte' }).eq('id', params.id)
        return NextResponse.json({ message: 'Abonnement annulé' })
      }

      // ── Mark invoice paid ──────────────────────────────────
      case 'mark_invoice_paid': {
        const { invoice_id } = body
        await supabaseAdmin.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', invoice_id)
        return NextResponse.json({ message: 'Facture marquée payée' })
      }

      // ── Toggle admin ───────────────────────────────────────
      case 'toggle_admin': {
        const { data: p } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', params.id).single()
        await supabaseAdmin.from('profiles').update({ is_admin: !p?.is_admin }).eq('id', params.id)
        return NextResponse.json({ message: `Admin ${!p?.is_admin ? 'activé' : 'désactivé'}` })
      }

      default:
        return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
