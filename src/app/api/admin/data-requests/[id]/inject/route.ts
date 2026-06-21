import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface MappedRow {
  company_name: string
  phone?: string | null
  email?: string | null
  website?: string | null
  contact_name?: string | null
  city?: string | null
  country?: string | null
  sector?: string | null
  is_manufacturer?: boolean | null
  custom_fields?: Record<string, string>
}

// POST /api/admin/data-requests/[id]/inject — bulk insert mapped rows as CRM leads
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: admin } = await supabaseAdmin
      .from('profiles').select('is_admin').eq('id', session.user.id).single()
    if (!admin?.is_admin) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

    const body = await req.json()
    const rows: MappedRow[] = body.rows
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Aucune ligne à injecter' }, { status: 400 })
    }

    // Load the request to find the target client
    const { data: request_row, error: reqErr } = await supabaseAdmin
      .from('data_upload_requests')
      .select('id, user_id, file_name, status')
      .eq('id', params.id)
      .single()
    if (reqErr || !request_row) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    }

    // Validate + clean rows — every row needs at least a company name
    const validRows = rows.filter(r => r.company_name && r.company_name.trim().length > 0)
    if (validRows.length === 0) {
      return NextResponse.json({ error: 'Aucune ligne valide (nom entreprise manquant)' }, { status: 400 })
    }

    const records = validRows.map(r => ({
      user_id:           request_row.user_id,
      source:             'import',
      import_request_id: request_row.id,
      status:             'to_call',
      priority:           'normal',
      company_name:       r.company_name.trim(),
      phone:              r.phone?.trim() || null,
      email:              r.email?.trim() || null,
      website:            r.website?.trim() || null,
      contact_name:       r.contact_name?.trim() || null,
      city:               r.city?.trim() || null,
      country:            r.country?.trim() || null,
      sector:             r.sector?.trim() || null,
      is_manufacturer:    typeof r.is_manufacturer === 'boolean' ? r.is_manufacturer : null,
      custom_fields:       r.custom_fields ?? {},
    }))

    // Insert in batches of 500 to stay well under any request/row limits
    const BATCH_SIZE = 500
    let insertedCount = 0
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)
      const { data, error } = await supabaseAdmin.from('crm_leads').insert(batch).select('id')
      if (error) {
        console.error('Injection batch failed:', error)
        return NextResponse.json({
          error: `Échec après ${insertedCount} ligne(s) insérée(s): ${error.message}`,
          insertedCount,
        }, { status: 500 })
      }
      insertedCount += data?.length ?? 0
    }

    // Mark the request as completed
    await supabaseAdmin.from('data_upload_requests').update({
      status:          'completed',
      processed_at:    new Date().toISOString(),
      injected_count:  insertedCount,
      injected_at:     new Date().toISOString(),
      admin_notes:     `${insertedCount} ligne(s) injectée(s) dans le CRM le ${new Date().toLocaleDateString('fr-FR')}.`,
    }).eq('id', params.id)

    return NextResponse.json({ success: true, insertedCount, skipped: rows.length - validRows.length })
  } catch (err: unknown) {
    console.error('Inject route error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}
