export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FIELD_COSTS, MAX_RESULTS } from '@/lib/constants'
import type { Business } from '@/types'

function buildQuery(filters: {
  sectors?: string[]; cities?: string[]; regions?: string[]
  effectif?: string[]; name?: string
}) {
  let q = supabaseAdmin.from('businesses').select('*', { count: 'exact' })
  if (filters.name?.trim())    q = q.ilike('name', `%${filters.name.trim()}%`)
  if (filters.sectors?.length)  q = q.in('sector', filters.sectors)
  if (filters.cities?.length)   q = q.in('city', filters.cities)
  if (filters.regions?.length)  q = q.in('region', filters.regions)
  if (filters.effectif?.length) q = q.in('effectif_label', filters.effectif)
  return q
}

function maskBusiness(b: Business, paidFields: string[], unlockedFields: Set<string>) {
  const raw = b as unknown as Record<string, unknown>
  const result: Record<string, unknown> = {
    id: b.id, name: b.name, sector: b.sector,
    city: b.city, region: b.region, country: b.country,
    forme_juridique: raw.forme_juridique ?? null,
    status: 'Actif',
  }
  for (const field of paidFields) {
    result[field]             = unlockedFields.has(field) ? (raw[field] ?? null) : null
    result[`${field}_locked`] = !unlockedFields.has(field)
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()
    const { filters = {}, fields = [], limit = 50 } = body as {
      filters: { sectors?: string[]; cities?: string[]; regions?: string[]; effectif?: string[]; name?: string }
      fields: string[]
      limit?: number
    }

    if (!fields.length) return NextResponse.json({ error: 'Aucun champ sélectionné' }, { status: 400 })

    const validFields = fields.filter(f => FIELD_COSTS[f] !== undefined)
    const paidFields  = validFields.filter(f => FIELD_COSTS[f] > 0)
    const costPerBiz  = paidFields.reduce((s, f) => s + FIELD_COSTS[f], 0)
    const actualLimit = Math.min(limit, MAX_RESULTS)

    // Fetch businesses
    const { data: businesses, count, error: dbErr } = await buildQuery(filters)
      .order('name').limit(actualLimit)

    if (dbErr) return NextResponse.json({ error: 'Erreur base de données: ' + dbErr.message }, { status: 500 })
    if (!businesses?.length) return NextResponse.json({
      queryId: null, businesses: [], totalCount: 0, creditsSpent: 0,
      fieldsRequested: validFields, filters, newBalance: 0,
    })

    const bizCount  = businesses.length
    const totalCost = costPerBiz * bizCount

    // Check balance
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('credit_balance').eq('id', user.id).single()
    const currentBalance = profile?.credit_balance ?? 0

    if (currentBalance < totalCost) {
      return NextResponse.json({
        error: `Crédits insuffisants. Coût: ${totalCost} cr, solde: ${currentBalance} cr`
      }, { status: 402 })
    }

    const newBalance = currentBalance - totalCost

    // Deduct credits
    if (totalCost > 0) {
      await supabaseAdmin.from('profiles')
        .update({ credit_balance: newBalance }).eq('id', user.id)

      await supabaseAdmin.from('credit_transactions').insert({
        user_id: user.id, amount: -totalCost, balance_after: newBalance,
        type: 'query',
        description: `Recherche ${bizCount} entreprises × ${costPerBiz} cr`,
      })
    }

    // Record unlocks (skip already-unlocked)
    const businessIds = businesses.map(b => b.id)
    const { data: existing } = await supabaseAdmin
      .from('unlock_events').select('business_id, field')
      .eq('user_id', user.id).in('business_id', businessIds)
      .in('field', paidFields.length ? paidFields : ['__none__'])

    const existingSet = new Set((existing ?? []).map(u => `${u.business_id}::${u.field}`))
    const newUnlocks = businesses.flatMap(biz =>
      paidFields
        .filter(f => !existingSet.has(`${biz.id}::${f}`))
        .map(f => ({ user_id: user.id, business_id: biz.id, field: f, credits_spent: FIELD_COSTS[f] }))
    )
    if (newUnlocks.length) {
      await supabaseAdmin.from('unlock_events')
        .upsert(newUnlocks, { onConflict: 'user_id,business_id,field', ignoreDuplicates: true })
    }

    // Get all unlocked fields
    const { data: allUnlocks } = await supabaseAdmin
      .from('unlock_events').select('business_id, field')
      .eq('user_id', user.id).in('business_id', businessIds)

    const unlockMap: Record<string, Set<string>> = {}
    for (const u of allUnlocks ?? []) {
      if (!unlockMap[u.business_id]) unlockMap[u.business_id] = new Set()
      unlockMap[u.business_id].add(u.field)
    }

    // Save query — try with business_ids, fallback without
    let queryId: string | null = null
    try {
      const insertData: Record<string, unknown> = {
        user_id: user.id, filters: { ...filters, fields },
        fields_requested: validFields, result_count: bizCount, credits_spent: totalCost,
      }
      // Try to insert with business_ids column
      try {
        const { data: q } = await supabaseAdmin.from('queries')
          .insert({ ...insertData, business_ids: businessIds }).select('id').single()
        queryId = q?.id ?? null
      } catch {
        // Fallback without business_ids
        const { data: q } = await supabaseAdmin.from('queries')
          .insert(insertData).select('id').single()
        queryId = q?.id ?? null
      }
    } catch (e) {
      console.error('Query save failed:', e)
      // Generate a temp ID — results are still usable
      queryId = crypto.randomUUID()
    }

    const masked = businesses.map(b =>
      maskBusiness(b as Business, paidFields, unlockMap[b.id] ?? new Set())
    )

    const responseData = {
      queryId,
      businesses:   masked,
      totalCount:   count ?? bizCount,
      displayCount: bizCount,
      creditsSpent: totalCost,
      costPerBiz,
      newBalance,
      fieldsRequested: validFields,
      filters,
    }

    return NextResponse.json(responseData)
  } catch (e) {
    console.error('Search error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
