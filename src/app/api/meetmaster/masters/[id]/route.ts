export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Params = { params: { id: string } }

export async function GET(_: NextRequest, { params }: Params) {
  const { data, error } = await supabaseAdmin
    .from('masters')
    .select('*')
    .eq('id', params.id)
    .eq('application_status', 'approved')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Master introuvable' }, { status: 404 })
  return NextResponse.json({ master: data })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()
    const { data, error } = await supabaseAdmin
      .from('masters')
      .update(body)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ master: data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
