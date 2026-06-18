export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FIELD_COSTS } from '@/lib/constants'
import type { MaskedBusiness, Business } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const queryId = searchParams.get('queryId')
    if (!queryId) return NextResponse.json({ error: 'queryId requis' }, { status: 400 })

    // Fetch query metadata (verify ownership)
    const { data: query, error: queryError } = await supabaseAdmin
      .from('queries')
      .select('*')
      .eq('id', queryId)
      .eq('user_id', user.id)
      .single()

    if (queryError || !query) {
      return NextResponse.json({ error: 'Requête introuvable' }, { status: 404 })
    }

    const filters = query.filters ?? {}
    const fieldsRequested: string[] = query.fields_requested ?? []
    const premiumFields = fieldsRequested.filter(f => FIELD_COSTS[f] !== undefined)

    // Re-run the original query
    let dbQuery = supabaseAdmin.from('businesses').select('*').order('name').limit(500)

    if (filters.search) {
      dbQuery = dbQuery.or(`name.ilike.%${filters.search}%,sector.ilike.%${filters.search}%`)
    }
    if (filters.sector) dbQuery = dbQuery.eq('sector', filters.sector)
    if (filters.city) dbQuery = dbQuery.eq('city', filters.city)
    if (filters.region) dbQuery = dbQuery.eq('region', filters.region)
    if (filters.effectif_label) dbQuery = dbQuery.eq('effectif_label', filters.effectif_label)

    const { data: businesses, error: dbError } = await dbQuery

    if (dbError) {
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
    }

    // Get unlock events for this user's businesses
    const { data: unlockEvents } = await supabaseAdmin
      .from('unlock_events')
      .select('business_id, field')
      .eq('user_id', user.id)
      .in('business_id', (businesses ?? []).map(b => b.id))

    const unlockMap: Record<string, Record<string, string>> = {}
    if (unlockEvents) {
      for (const evt of unlockEvents) {
        if (!unlockMap[evt.business_id]) unlockMap[evt.business_id] = {}
        const biz = (businesses ?? []).find(b => b.id === evt.business_id)
        if (biz) {
          unlockMap[evt.business_id][evt.field] = (biz as unknown as Record<string, string>)[evt.field]
        }
      }
    }

    // Mask
    const maskedBusinesses: MaskedBusiness[] = (businesses ?? []).map(biz => {
      const b = biz as unknown as Business
      const unlocked = unlockMap[b.id] ?? {}

      return {
        id: b.id,
        name: b.name,
        sector: b.sector,
        subsector: b.subsector,
        region: b.region,
        city: b.city,
        country: b.country,
        legal_form: b.legal_form,
        phone: premiumFields.includes('phone') ? b.phone : null,
        email: premiumFields.includes('email') ? b.email : null,
        website: premiumFields.includes('website') ? b.website : null,
        address: premiumFields.includes('address') ? b.address : null,
        effectif_label: premiumFields.includes('effectif_label') ? b.effectif_label : null,
        dirigeant_name: premiumFields.includes('dirigeant_name') ? b.dirigeant_name : null,
        dirigeant_phone: premiumFields.includes('dirigeant_phone') ? b.dirigeant_phone : null,
        dirigeant_email: premiumFields.includes('dirigeant_email') ? b.dirigeant_email : null,
        revenue_label: premiumFields.includes('revenue_label') ? b.revenue_label : null,
        unlocked,
      } as MaskedBusiness
    })

    // Get current balance
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('credit_balance')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      queryId: query.id,
      businesses: maskedBusinesses,
      totalCount: maskedBusinesses.length,
      creditsSpent: query.credits_spent,
      newBalance: profile?.credit_balance ?? 0,
      fieldsRequested,
      filters,
    })
  } catch (e) {
    console.error('Results API error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
