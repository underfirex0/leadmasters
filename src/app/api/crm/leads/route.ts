export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { CRMStatus } from '@/types'

// Fields that are FREE — always visible
const FREE_FIELDS = new Set(['name','sector','city','region','country','legal_form','forme_juridique','status'])

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as CRMStatus | null

    let query = supabaseAdmin
      .from('crm_leads')
      .select('*, call_logs:crm_call_logs(*)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data: leads, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!leads?.length) return NextResponse.json({ leads: [], counts: {} })

    // Fetch businesses
    const bizIds = [...new Set(leads.map(l => l.business_id))]
    const { data: businesses } = await supabaseAdmin
      .from('businesses').select('*').in('id', bizIds)

    // Fetch what the user has actually unlocked
    const { data: unlockEvents } = await supabaseAdmin
      .from('unlock_events').select('business_id, field')
      .eq('user_id', user.id).in('business_id', bizIds)

    // Build unlock map: bizId → { field: value }
    const unlockMap: Record<string, Record<string, string | null>> = {}
    for (const evt of unlockEvents ?? []) {
      if (!unlockMap[evt.business_id]) unlockMap[evt.business_id] = {}
      const biz = businesses?.find(b => b.id === evt.business_id)
      if (biz) {
        const val = (biz as Record<string, unknown>)[evt.field]
        unlockMap[evt.business_id][evt.field] = (val as string) ?? null
      }
    }

    // Build enriched leads — STRICT masking
    const enriched = leads.map(lead => {
      const biz = businesses?.find(b => b.id === lead.business_id)
      const unlocked = unlockMap[lead.business_id] ?? {}

      if (!biz) return { ...lead, business: null }

      const raw = biz as Record<string, unknown>

      // Get all fields from business, only expose if free OR unlocked
      const allFields = Object.keys(raw)
      const maskedFields: Record<string, unknown> = {}

      for (const field of allFields) {
        if (FREE_FIELDS.has(field) || field === 'id' || field === 'created_at') {
          maskedFields[field] = raw[field]
        } else if (field in unlocked) {
          maskedFields[field] = unlocked[field]
        } else {
          // Paid field not unlocked → null
          maskedFields[field] = null
        }
      }

      return {
        ...lead,
        business: {
          ...maskedFields,
          unlocked,      // Pass the unlocked map so UI can show "Non débloqué"
          _unlocked_fields: Object.keys(unlocked), // For UI checks
        }
      }
    })

    // Status counts
    const { data: allLeads } = await supabaseAdmin
      .from('crm_leads').select('status').eq('user_id', user.id)
    const counts: Record<string, number> = {}
    allLeads?.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1 })

    return NextResponse.json({ leads: enriched, counts })
  } catch (e) {
    console.error('CRM GET error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { businessIds, queryId } = await request.json()
    if (!businessIds?.length) return NextResponse.json({ error: 'businessIds requis' }, { status: 400 })

    const records = businessIds.map((bid: string) => ({
      user_id: user.id, business_id: bid,
      query_id: queryId || null, status: 'to_call',
    }))

    const { data, error } = await supabaseAdmin
      .from('crm_leads')
      .upsert(records, { onConflict: 'user_id,business_id', ignoreDuplicates: true })
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      added: data?.length ?? 0,
      total: businessIds.length,
      message: `${data?.length ?? 0} lead(s) ajouté(s) au CRM`,
    })
  } catch (e) {
    console.error('CRM POST error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
