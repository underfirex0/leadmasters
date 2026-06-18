export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Params = { params: { id: string } }

async function isAdmin(uid: string) {
  const { data } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', uid).single()
  return data?.is_admin === true
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !(await isAdmin(user.id))) return NextResponse.json({ error: 'Refusé' }, { status: 403 })

    const { action, notes } = await req.json()

    if (action === 'mark_paid') {
      await supabaseAdmin.from('invoices').update({
        status: 'paid', paid_at: new Date().toISOString(), notes: notes || null,
      }).eq('id', params.id)
      return NextResponse.json({ message: 'Facture marquée payée' })
    }

    if (action === 'cancel') {
      await supabaseAdmin.from('invoices').update({ status: 'cancelled', notes: notes || 'Annulée par admin' })
        .eq('id', params.id)
      return NextResponse.json({ message: 'Facture annulée' })
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
