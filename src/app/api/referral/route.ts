export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('referral_code').eq('id', user.id).single()

    const { data: referrals } = await supabaseAdmin
      .from('referrals').select('*, referred:profiles!referred_id(full_name, email)')
      .eq('referrer_id', user.id).order('created_at', { ascending: false })

    const completed = (referrals ?? []).filter(r => r.status === 'completed').length
    const earned    = completed * 100

    return NextResponse.json({
      referral_code: profile?.referral_code,
      referrals:     referrals ?? [],
      total_referred: referrals?.length ?? 0,
      completed,
      credits_earned: earned,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { code } = await request.json()
    if (!code) return NextResponse.json({ error: 'Code requis' }, { status: 400 })

    // Find referrer
    const { data: referrer } = await supabaseAdmin
      .from('profiles').select('id, credit_balance').eq('referral_code', code).single()

    if (!referrer) return NextResponse.json({ error: 'Code invalide' }, { status: 404 })
    if (referrer.id === user.id) return NextResponse.json({ error: 'Vous ne pouvez pas utiliser votre propre code' }, { status: 400 })

    // Check not already used
    const { data: existing } = await supabaseAdmin
      .from('referrals').select('id').eq('referred_id', user.id).single()
    if (existing) return NextResponse.json({ error: 'Vous avez déjà utilisé un code parrainage' }, { status: 409 })

    const REFERRAL_CREDITS = 100

    // Add credits to both
    const { data: referred } = await supabaseAdmin
      .from('profiles').select('credit_balance').eq('id', user.id).single()

    const referrerNew = referrer.credit_balance + REFERRAL_CREDITS
    const referredNew = (referred?.credit_balance ?? 0) + REFERRAL_CREDITS

    await supabaseAdmin.from('profiles').update({ credit_balance: referrerNew }).eq('id', referrer.id)
    await supabaseAdmin.from('profiles').update({ credit_balance: referredNew, referred_by: referrer.id }).eq('id', user.id)

    // Log transactions
    await supabaseAdmin.from('credit_transactions').insert([
      { user_id: referrer.id, amount: REFERRAL_CREDITS, balance_after: referrerNew, type: 'grant', description: 'Parrainage accepté — +100 crédits' },
      { user_id: user.id,     amount: REFERRAL_CREDITS, balance_after: referredNew, type: 'grant', description: 'Code parrainage utilisé — +100 crédits' },
    ])

    // Create referral record
    await supabaseAdmin.from('referrals').insert({
      referrer_id: referrer.id, referred_id: user.id,
      referral_code: code, status: 'completed',
      credits_awarded: REFERRAL_CREDITS, completed_at: new Date().toISOString(),
    })

    return NextResponse.json({ message: '+100 crédits ajoutés à votre compte !', credits: REFERRAL_CREDITS })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
