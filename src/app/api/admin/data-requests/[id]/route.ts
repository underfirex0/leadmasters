import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// PATCH /api/admin/data-requests/[id] — update status / admin notes
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', session.user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

    const body = await req.json()
    const { status, admin_notes } = body

    const updateData: Record<string, unknown> = {}
    if (status)      updateData.status      = status
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes
    if (status === 'completed' || status === 'rejected') updateData.processed_at = new Date().toISOString()

    const { error } = await supabaseAdmin
      .from('data_upload_requests')
      .update(updateData)
      .eq('id', params.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}

// GET /api/admin/data-requests/[id]?action=download — generate signed download URL
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', session.user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

    // Get file path from DB
    const { data: req_data, error: dbErr } = await supabaseAdmin
      .from('data_upload_requests')
      .select('file_path, file_name')
      .eq('id', params.id)
      .single()
    if (dbErr || !req_data) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

    // Generate signed URL valid 60 minutes
    const { data: signedUrl, error: urlErr } = await supabaseAdmin.storage
      .from('data-uploads')
      .createSignedUrl(req_data.file_path, 3600)
    if (urlErr) throw urlErr

    return NextResponse.json({ url: signedUrl.signedUrl, file_name: req_data.file_name })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}
