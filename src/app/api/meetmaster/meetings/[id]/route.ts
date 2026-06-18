export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Params = { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()
    const { action, meeting_link, confirmed_date, rejection_reason,
            buyer_feedback, buyer_rating, master_feedback, master_rating } = body

    // Get the meeting
    const { data: meeting } = await supabaseAdmin
      .from('meeting_requests')
      .select('*, master:masters(user_id)')
      .eq('id', params.id)
      .single()

    if (!meeting) return NextResponse.json({ error: 'Meeting introuvable' }, { status: 404 })

    const isBuyer  = meeting.buyer_id === user.id
    const isMaster = meeting.master?.user_id === user.id

    if (!isBuyer && !isMaster) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    let update: Record<string, unknown> = {}

    switch (action) {
      case 'accept':
        if (!isMaster) return NextResponse.json({ error: 'Seul le Master peut accepter' }, { status: 403 })
        update = {
          status: 'accepted',
          meeting_link: meeting_link || null,
          confirmed_date: confirmed_date || null,
        }
        break

      case 'reject':
        if (!isMaster) return NextResponse.json({ error: 'Seul le Master peut refuser' }, { status: 403 })
        update = { status: 'rejected', rejection_reason: rejection_reason || null }
        break

      case 'cancel':
        update = {
          status: isBuyer ? 'cancelled_buyer' : 'cancelled_master',
        }
        break

      case 'complete':
        update = { status: 'completed' }
        // Update master stats
        await supabaseAdmin
          .from('masters')
          .update({ meetings_completed: meeting.master ? (await supabaseAdmin
            .from('masters').select('meetings_completed').eq('id', meeting.master_id).single()
          ).data?.meetings_completed + 1 || 1 : 1 })
          .eq('id', meeting.master_id)
        break

      case 'feedback':
        if (isBuyer) {
          update = { buyer_feedback, buyer_rating }
          // Recalculate average rating for master
          if (buyer_rating) {
            const { data: allRatings } = await supabaseAdmin
              .from('meeting_requests')
              .select('buyer_rating')
              .eq('master_id', meeting.master_id)
              .eq('status', 'completed')
              .not('buyer_rating', 'is', null)

            const ratings = [...(allRatings ?? []).map(r => r.buyer_rating), buyer_rating]
            const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length
            await supabaseAdmin
              .from('masters')
              .update({ average_rating: Math.round(avg * 10) / 10 })
              .eq('id', meeting.master_id)
          }
        } else {
          update = { master_feedback, master_rating }
        }
        break

      default:
        return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('meeting_requests')
      .update(update)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ meeting: data })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
