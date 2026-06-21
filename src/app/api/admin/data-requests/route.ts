import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET /api/admin/data-requests — list all requests with user info
export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', session.user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') // optional filter
    const id     = searchParams.get('id')     // optional: fetch a single request

    let query = supabaseAdmin
      .from('data_upload_requests')
      .select(`
        id, file_name, file_path, file_size_bytes, estimated_rows,
        user_notes, admin_notes, status, created_at, updated_at, processed_at,
        injected_count, injected_at,
        profiles!user_id (id, email, full_name, plan_id)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (status) query = query.eq('status', status)
    if (id)     query = query.eq('id', id)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ requests: data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}
