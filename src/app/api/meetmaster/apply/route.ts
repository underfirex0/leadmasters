export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    // Check if already applied
    const { data: existing } = await supabaseAdmin
      .from('masters')
      .select('id, application_status')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({
        error: 'Vous avez déjà soumis une candidature.',
        status: existing.application_status
      }, { status: 409 })
    }

    const body = await request.json()
    const { full_name, role, company_sector, company_size, city,
            bio, expertise, topics, linkedin_url, max_meetings_per_month } = body

    // Build display_name (first name + last initial)
    const parts = (full_name || '').trim().split(' ')
    const display_name = parts.length > 1
      ? `${parts[0]} ${parts[parts.length - 1][0]}.`
      : parts[0] || 'Anonyme'

    const { data, error } = await supabaseAdmin
      .from('masters')
      .insert({
        user_id: user.id,
        full_name,
        display_name,
        role,
        company_sector,
        company_size,
        city,
        bio,
        expertise: expertise ?? [],
        topics: topics ?? [],
        linkedin_url: linkedin_url || null,
        max_meetings_per_month: max_meetings_per_month ?? 4,
        application_status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ master: data, message: 'Candidature soumise avec succès' })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
