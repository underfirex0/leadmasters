export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FIELD_COSTS } from '@/lib/constants'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(request.url)

    // Support both single value and comma-separated multi-values
    const sectors  = searchParams.get('sectors')?.split(',').filter(Boolean) ?? []
    const cities   = searchParams.get('cities')?.split(',').filter(Boolean) ?? []
    const regions  = searchParams.get('regions')?.split(',').filter(Boolean) ?? []
    const effectif = searchParams.get('effectif')?.split(',').filter(Boolean) ?? []
    const name     = searchParams.get('name') || ''
    const fields   = searchParams.get('fields')?.split(',').filter(Boolean) ?? []
    const limit    = parseInt(searchParams.get('limit') || '50')

    let q = supabaseAdmin.from('businesses').select('*', { count: 'exact', head: true })
    if (name)             q = q.ilike('name', `%${name}%`)
    if (sectors.length)   q = q.in('sector', sectors)
    if (cities.length)    q = q.in('city', cities)
    if (regions.length)   q = q.in('region', regions)
    if (effectif.length)  q = q.in('effectif_label', effectif)

    const { count, error } = await q
    if (error) return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })

    const totalCount   = Math.min(count ?? 0, limit)
    const paidFields   = fields.filter(f => FIELD_COSTS[f] && FIELD_COSTS[f] > 0)
    const costPerBiz   = paidFields.reduce((s, f) => s + (FIELD_COSTS[f] ?? 0), 0)
    const totalCost    = costPerBiz * totalCount

    return NextResponse.json({
      count: count ?? 0,
      display_count: totalCount,
      cost_per_biz: costPerBiz,
      total_cost: totalCost,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
