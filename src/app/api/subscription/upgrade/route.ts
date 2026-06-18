export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { plan_id, billing_cycle = 'monthly' } = await request.json()
    if (!plan_id) return NextResponse.json({ error: 'plan_id requis' }, { status: 400 })

    // Validate plan exists
    const { data: plan } = await supabaseAdmin.from('plans').select('*').eq('id', plan_id).single()
    if (!plan) return NextResponse.json({ error: 'Plan introuvable' }, { status: 404 })

    // Check for existing subscription
    const { data: existing } = await supabaseAdmin
      .from('subscriptions').select('*').eq('user_id', user.id)
      .in('status', ['active', 'pending']).single()

    if (plan_id === 'decouverte') {
      // Downgrade to free — instant
      await supabaseAdmin.from('subscriptions').update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('user_id', user.id).in('status', ['active','pending'])
      await supabaseAdmin.from('profiles').update({ plan_id: 'decouverte' }).eq('id', user.id)
      return NextResponse.json({ message: 'Retour au plan gratuit effectué.', status: 'downgraded' })
    }

    // Calculate price
    const price = billing_cycle === 'annual' ? plan.price_annual_monthly * 12 : plan.price_monthly
    const tva_amount = Math.round(price * 0.20)

    // Create or update subscription request
    const subData = {
      user_id:     user.id,
      plan_id,
      billing_cycle,
      status:      'pending',
      current_period_start: new Date().toISOString(),
      current_period_end: null,
      rollover_credits: 0,
    }

    let sub
    if (existing) {
      const { data } = await supabaseAdmin.from('subscriptions')
        .update({ ...subData, updated_at: new Date().toISOString() })
        .eq('id', existing.id).select().single()
      sub = data
    } else {
      const { data } = await supabaseAdmin.from('subscriptions')
        .insert(subData).select().single()
      sub = data
    }

    // Create invoice
    const invoiceNumber = await supabaseAdmin.rpc('generate_invoice_number')
    await supabaseAdmin.from('invoices').insert({
      user_id:       user.id,
      invoice_number: invoiceNumber.data,
      type:          'subscription',
      amount_ht:     price,
      tva_rate:      20,
      tva_amount:    tva_amount,
      total_ttc:     price + tva_amount,
      plan_id,
      billing_cycle,
      status:        'pending',
      period_start:  new Date().toISOString(),
    })

    return NextResponse.json({
      message:    'Demande soumise. Notre équipe vous contacte sous 24h pour le paiement.',
      subscription: sub,
      invoice_amount: price + tva_amount,
      status: 'pending',
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
