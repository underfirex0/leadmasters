export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FIELD_COSTS } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { businessId, field } = await request.json()
    if (!businessId || !field) return NextResponse.json({ error: 'businessId et field requis' }, { status: 400 })

    const cost = FIELD_COSTS[field]
    if (cost === undefined || cost === 0) return NextResponse.json({ error: 'Champ invalide' }, { status: 400 })

    // Already unlocked?
    const { data: existing } = await supabaseAdmin
      .from('unlock_events').select('id')
      .eq('user_id', user.id).eq('business_id', businessId).eq('field', field).maybeSingle()

    // Get business
    const { data: biz, error: bizErr } = await supabaseAdmin
      .from('businesses').select('*').eq('id', businessId).single()
    if (bizErr || !biz) return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 })

    const value = (biz as Record<string, unknown>)[field]
    if (!value) return NextResponse.json({ error: 'Donnée non disponible pour ce champ' }, { status: 404 })

    // Get current balance
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('credit_balance').eq('id', user.id).single()
    const currentBalance = profile?.credit_balance ?? 0

    // Already unlocked → return free
    if (existing) {
      return NextResponse.json({ value, creditsSpent: 0, newBalance: currentBalance, alreadyUnlocked: true })
    }

    // Check balance
    if (currentBalance < cost) {
      return NextResponse.json({ error: 'Crédits insuffisants', required: cost, available: currentBalance }, { status: 402 })
    }

    const newBalance = currentBalance - cost

    // Deduct directly
    const { error: updateErr } = await supabaseAdmin
      .from('profiles').update({ credit_balance: newBalance }).eq('id', user.id)
    if (updateErr) return NextResponse.json({ error: 'Erreur déduction' }, { status: 500 })

    // Log transaction
    await supabaseAdmin.from('credit_transactions').insert({
      user_id: user.id, amount: -cost, balance_after: newBalance,
      type: 'unlock', description: `Déverrouillage ${field} — ${biz.name}`,
    })

    // Record unlock (handle race condition)
    const { error: unlockErr } = await supabaseAdmin.from('unlock_events').insert({
      user_id: user.id, business_id: businessId, field, credits_spent: cost,
    })

    if (unlockErr?.code === '23505') {
      // Race condition — refund
      await supabaseAdmin.from('profiles').update({ credit_balance: currentBalance }).eq('id', user.id)
      return NextResponse.json({ value, creditsSpent: 0, newBalance: currentBalance, alreadyUnlocked: true })
    }

    return NextResponse.json({ value, creditsSpent: cost, newBalance, alreadyUnlocked: false })
  } catch (e) {
    console.error('Unlock error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
