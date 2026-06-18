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
    const queryId = searchParams.get('queryId')
    if (!queryId) return NextResponse.json({ error: 'queryId requis' }, { status: 400 })

    // Get user plan and CSV limit
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('plan_id').eq('id', user.id).single()
    const { data: plan } = await supabaseAdmin
      .from('plans').select('csv_export_limit').eq('id', profile?.plan_id ?? 'decouverte').single()

    const csvLimit: number | null = plan?.csv_export_limit ?? 5

    // Get query
    const { data: query } = await supabaseAdmin
      .from('queries').select('*').eq('id', queryId).eq('user_id', user.id).single()
    if (!query) return NextResponse.json({ error: 'Requête introuvable' }, { status: 404 })

    // Get unlocked data
    const { data: businesses } = await supabaseAdmin
      .from('businesses').select('*').in('id', query.business_ids ?? [])

    const { data: unlocks } = await supabaseAdmin
      .from('unlock_events').select('business_id, field')
      .eq('user_id', user.id).in('business_id', query.business_ids ?? [])

    const unlockMap: Record<string, Set<string>> = {}
    for (const u of unlocks ?? []) {
      if (!unlockMap[u.business_id]) unlockMap[u.business_id] = new Set()
      unlockMap[u.business_id].add(u.field)
    }

    let rows = (businesses ?? []).map(b => {
      const u = unlockMap[b.id] || new Set()
      return {
        'Raison sociale': b.name || '',
        'Secteur': b.sector || '',
        'Ville': b.city || '',
        'Région': b.region || '',
        'Forme juridique': b.forme_juridique || '',
        'Téléphone': u.has('phone') ? (b.phone || '') : '',
        'E-mail': u.has('email') ? (b.email || '') : '',
        'Site web': u.has('website') ? (b.website || '') : '',
        'Adresse': u.has('address') ? (b.address || '') : '',
        'Effectif': u.has('effectif_label') ? (b.effectif_label || '') : '',
        'Nom dirigeant': u.has('dirigeant_name') ? (b.dirigeant_name || '') : '',
        'Année création': u.has('annee_creation') ? (b.annee_creation || '') : '',
        'Tél. dirigeant': u.has('dirigeant_phone') ? (b.dirigeant_phone || '') : '',
        'E-mail dirigeant': u.has('dirigeant_email') ? (b.dirigeant_email || '') : '',
        'Chiffre d\'affaires': u.has('revenue_label') ? (b.revenue_label || '') : '',
        'Capital social': u.has('capital_social') ? (b.capital_social || '') : '',
      }
    })

    // Apply CSV limit
    if (csvLimit !== null && rows.length > csvLimit) {
      rows = rows.slice(0, csvLimit)
    }

    // Build CSV
    const bom = '\uFEFF'
    const headers = Object.keys(rows[0] || {})
    const csv = bom + [
      headers.join(','),
      ...rows.map(row => headers.map(h => `"${String(row[h as keyof typeof row] ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const limitMsg = csvLimit !== null && (businesses?.length ?? 0) > csvLimit
      ? `; ${businesses?.length} résultats — limité à ${csvLimit} lignes (plan ${profile?.plan_id})`
      : ''

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leadscout-export.csv"`,
        'X-Export-Info': `${rows.length} lignes${limitMsg}`,
      }
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
