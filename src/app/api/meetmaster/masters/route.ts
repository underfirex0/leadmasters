export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role   = searchParams.get('role')
    const sector = searchParams.get('sector')
    const city   = searchParams.get('city')

    let query = supabaseAdmin
      .from('masters')
      .select('*')
      .eq('application_status', 'approved')
      .eq('is_active', true)
      .order('meetings_completed', { ascending: false })

    if (role)   query = query.eq('role', role)
    if (sector) query = query.eq('company_sector', sector)
    if (city)   query = query.eq('city', city)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ masters: data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
