export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function isAdmin(uid: string) {
  const { data } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', uid).single()
  return data?.is_admin === true
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !(await isAdmin(user.id))) return NextResponse.json({ error: 'Refusé' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const sector = searchParams.get('sector') || ''
    const city   = searchParams.get('city')   || ''
    const page   = parseInt(searchParams.get('page') || '1')
    const per    = 25
    const from   = (page - 1) * per
    const statsOnly = searchParams.get('stats') === '1'

    if (statsOnly) {
      const [
        { count: total },
        { count: withEmail },
        { count: withPhone },
        { count: withDirigent },
        { data: sectorData },
        { data: cityData },
      ] = await Promise.all([
        supabaseAdmin.from('businesses').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('businesses').select('*', { count: 'exact', head: true }).not('email', 'is', null),
        supabaseAdmin.from('businesses').select('*', { count: 'exact', head: true }).not('phone', 'is', null),
        supabaseAdmin.from('businesses').select('*', { count: 'exact', head: true }).not('dirigeant_name', 'is', null),
        supabaseAdmin.from('businesses').select('sector').limit(1000),
        supabaseAdmin.from('businesses').select('city').limit(1000),
      ])

      // Count by sector and city
      const sectorCounts: Record<string, number> = {}
      for (const b of sectorData ?? []) if (b.sector) sectorCounts[b.sector] = (sectorCounts[b.sector] || 0) + 1

      const cityCounts: Record<string, number> = {}
      for (const b of cityData ?? []) if (b.city) cityCounts[b.city] = (cityCounts[b.city] || 0) + 1

      const topSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
      const topCities  = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

      return NextResponse.json({ total, withEmail, withPhone, withDirigent, topSectors, topCities })
    }

    // Paginated list
    let q = supabaseAdmin
      .from('businesses')
      .select('id, name, sector, city, region, phone, email, website, effectif_label, dirigeant_name, revenue_label, created_at', { count: 'exact' })
      .order('name')
      .range(from, from + per - 1)

    if (search) q = q.ilike('name', `%${search}%`)
    if (sector) q = q.eq('sector', sector)
    if (city)   q = q.eq('city', city)

    const { data, count, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ businesses: data ?? [], total: count ?? 0, page, per })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
