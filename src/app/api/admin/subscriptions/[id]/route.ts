export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Params = { params: { id: string } }

async function isAdmin(uid: string) {
  const { data } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', uid).single()
  return data?.is_admin === true
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !(await isAdmin(user.id))) return NextResponse.json({ error: 'Refusé' }, { status: 403 })

    const { action, payment_ref, notes } = await req.json()

    const { data: sub } = await supabaseAdmin
      .from('subscriptions').select('*, plan:plans(*)').eq('id', params.id).single()
    if (!sub) return NextResponse.json({ error: 'Abonnement introuvable' }, { status: 404 })

    const plan = sub.plan as Record<string, unknown>

    switch (action) {
      case 'activate': {
        const now = new Date()
        const periodEnd = sub.billing_cycle === 'annual'
          ? new Date(now.getTime() + 365 * 86400000).toISOString()
          : new Date(now.getTime() +  30 * 86400000).toISOString()

        // Activate subscription
        await supabaseAdmin.from('subscriptions').update({
          status:               'active',
          current_period_start: now.toISOString(),
          current_period_end:   periodEnd,
          activated_at:         now.toISOString(),
          notes:                [sub.notes, notes, payment_ref ? `Réf. paiement: ${payment_ref}` : ''].filter(Boolean).join(' | '),
          updated_at:           now.toISOString(),
        }).eq('id', params.id)

        // Update profile plan
        await supabaseAdmin.from('profiles').update({ plan_id: sub.plan_id }).eq('id', sub.user_id)

        // Add monthly credits
        if (plan?.credits_per_month) {
          const { data: profile } = await supabaseAdmin.from('profiles').select('credit_balance').eq('id', sub.user_id).single()
          const newBal = (profile?.credit_balance ?? 0) + (plan.credits_per_month as number)
          await supabaseAdmin.from('profiles').update({ credit_balance: newBal }).eq('id', sub.user_id)
          await supabaseAdmin.from('credit_transactions').insert({
            user_id: sub.user_id, amount: plan.credits_per_month, balance_after: newBal,
            type: 'grant', description: `Activation plan ${plan.name} — ${plan.credits_per_month} crédits`,
          })
        }

        // Mark pending invoice paid
        await supabaseAdmin.from('invoices')
          .update({ status: 'paid', paid_at: now.toISOString(), notes: payment_ref ? `Réf: ${payment_ref}` : null })
          .eq('user_id', sub.user_id).eq('status', 'pending').eq('type', 'subscription')

        return NextResponse.json({ message: `Plan activé jusqu'au ${new Date(periodEnd).toLocaleDateString('fr-FR')}` })
      }

      case 'reject': {
        await supabaseAdmin.from('subscriptions').update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          notes: notes || 'Rejeté par admin',
          updated_at: new Date().toISOString(),
        }).eq('id', params.id)
        // Cancel related invoice
        await supabaseAdmin.from('invoices').update({ status: 'cancelled' })
          .eq('user_id', sub.user_id).eq('status', 'pending')
        return NextResponse.json({ message: 'Demande rejetée' })
      }

      case 'cancel': {
        await supabaseAdmin.from('subscriptions').update({
          status: 'cancelled', cancelled_at: new Date().toISOString(),
          notes: notes || 'Annulé par admin', updated_at: new Date().toISOString(),
        }).eq('id', params.id)
        await supabaseAdmin.from('profiles').update({ plan_id: 'decouverte' }).eq('id', sub.user_id)
        return NextResponse.json({ message: 'Abonnement annulé' })
      }

      default:
        return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
