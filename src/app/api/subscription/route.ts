export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('*, plan:plans(*)').eq('id', user.id).single()

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions').select('*, plan:plans(*)')
      .eq('user_id', user.id).in('status', ['active','pending']).single()

    const { data: packs } = await supabaseAdmin
      .from('pack_purchases').select('*, pack:credit_packs(*)')
      .eq('user_id', user.id).gt('credits_remaining', 0)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true })

    // Check if renewal is due
    let renewalResult = null
    if (subscription?.status === 'active' && subscription?.current_period_end) {
      if (new Date(subscription.current_period_end) < new Date()) {
        const { data } = await supabaseAdmin.rpc('process_subscription_renewal', { p_user_id: user.id })
        renewalResult = data
      }
    }

    const topupCredits = (packs ?? []).reduce((s, p) => s + p.credits_remaining, 0)

    return NextResponse.json({
      profile,
      subscription,
      packs: packs ?? [],
      topup_credits: topupCredits,
      renewal: renewalResult,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
