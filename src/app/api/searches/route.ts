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
    const page    = parseInt(searchParams.get('page') || '1')
    const perPage = 20
    const from    = (page - 1) * perPage

    const { data: queries, count, error } = await supabaseAdmin
      .from('queries')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, from + perPage - 1)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Summary stats
    const { data: allQueries } = await supabaseAdmin
      .from('queries').select('credits_spent, result_count').eq('user_id', user.id)

    const totalCredits = (allQueries ?? []).reduce((s, q) => s + (q.credits_spent ?? 0), 0)
    const totalResults = (allQueries ?? []).reduce((s, q) => s + (q.result_count ?? 0), 0)

    return NextResponse.json({
      queries:       queries ?? [],
      total:         count ?? 0,
      page,
      per_page:      perPage,
      total_credits: totalCredits,
      total_results: totalResults,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { queryId } = await request.json()
    if (!queryId) return NextResponse.json({ error: 'queryId requis' }, { status: 400 })

    await supabaseAdmin.from('queries')
      .delete().eq('id', queryId).eq('user_id', user.id)

    return NextResponse.json({ message: 'Recherche supprimée' })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
