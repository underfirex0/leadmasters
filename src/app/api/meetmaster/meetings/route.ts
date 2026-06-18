export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') // 'buyer' | 'master'

    if (role === 'master') {
      // Get master record
      const { data: master } = await supabaseAdmin
        .from('masters')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!master) return NextResponse.json({ meetings: [] })

      const { data, error } = await supabaseAdmin
        .from('meeting_requests')
        .select('*')
        .eq('master_id', master.id)
        .order('created_at', { ascending: false })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Enrich with buyer profile
      const buyerIds = [...new Set((data ?? []).map(m => m.buyer_id))]
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', buyerIds)

      const enriched = (data ?? []).map(m => ({
        ...m,
        buyer_profile: profiles?.find(p => p.id === m.buyer_id),
      }))

      return NextResponse.json({ meetings: enriched })
    } else {
      // Buyer view
      const { data, error } = await supabaseAdmin
        .from('meeting_requests')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Enrich with master info
      const masterIds = [...new Set((data ?? []).map(m => m.master_id))]
      const { data: masters } = await supabaseAdmin
        .from('masters')
        .select('id, display_name, role, company_sector, city, is_verified')
        .in('id', masterIds)

      const enriched = (data ?? []).map(m => ({
        ...m,
        master: masters?.find(ma => ma.id === m.master_id),
      }))

      return NextResponse.json({ meetings: enriched })
    }
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()
    const {
      master_id, topic, context, buyer_company, buyer_role,
      preferred_date_1, preferred_date_2, preferred_date_3,
    } = body

    if (!master_id || !topic) {
      return NextResponse.json({ error: 'master_id et topic requis' }, { status: 400 })
    }

    // Check master exists
    const { data: master } = await supabaseAdmin
      .from('masters')
      .select('id, max_meetings_per_month')
      .eq('id', master_id)
      .eq('application_status', 'approved')
      .single()

    if (!master) return NextResponse.json({ error: 'Master introuvable' }, { status: 404 })

    // Check not already pending with this master
    const { data: existing } = await supabaseAdmin
      .from('meeting_requests')
      .select('id')
      .eq('buyer_id', user.id)
      .eq('master_id', master_id)
      .in('status', ['pending', 'accepted'])
      .single()

    if (existing) {
      return NextResponse.json({
        error: 'Vous avez déjà une demande en cours avec ce Master.'
      }, { status: 409 })
    }

    const { data, error } = await supabaseAdmin
      .from('meeting_requests')
      .insert({
        buyer_id: user.id,
        master_id,
        topic,
        context: context || null,
        buyer_company: buyer_company || null,
        buyer_role: buyer_role || null,
        preferred_date_1: preferred_date_1 || null,
        preferred_date_2: preferred_date_2 || null,
        preferred_date_3: preferred_date_3 || null,
        status: 'pending',
        amount_buyer: 1000,
        amount_master: 500,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ meeting: data })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
