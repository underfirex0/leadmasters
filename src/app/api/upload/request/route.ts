import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const { file_name, file_path, file_size_bytes, estimated_rows, user_notes } = body

    if (!file_name || !file_path) {
      return NextResponse.json({ error: 'file_name et file_path sont requis' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('data_upload_requests')
      .insert({
        user_id:         session.user.id,
        file_name,
        file_path,
        file_size_bytes: file_size_bytes ?? null,
        estimated_rows:  estimated_rows  ?? null,
        user_notes:      user_notes      ?? null,
        status:          'pending',
      })
      .select('id')
      .single()

    if (error) throw error

    // Log activity (non-blocking — never let a logging failure break the upload)
    try {
      await supabaseAdmin.from('activity_logs').insert({
        user_id: session.user.id,
        action:  'data_upload_request',
        details: { request_id: data.id, file_name },
      })
    } catch {
      // Table may not exist or insert failed — ignore, this is non-critical
    }

    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
