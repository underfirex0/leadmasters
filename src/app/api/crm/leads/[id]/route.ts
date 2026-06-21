export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Params = { params: { id: string } }

const STATUS_LABELS: Record<string, string> = {
  to_call: 'À appeler', in_progress: 'En cours', callback: 'À rappeler',
  interested: 'Intéressé', not_interested: 'Pas intéressé',
  converted: 'Converti', archived: 'Archivé',
}

async function log(userId: string, leadId: string, businessName: string, actionType: string, fromVal?: string, toVal?: string, details?: Record<string, unknown>) {
  try {
    await supabaseAdmin.from('crm_activity_logs').insert({
      user_id: userId, lead_id: leadId, business_name: businessName,
      action_type: actionType, from_value: fromVal, to_value: toVal,
      details: details ?? {},
    })
  } catch {
    // Activity log is non-critical — never let it block the primary action
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()
    const { status, priority, notes, callback_date, callback_note, call_outcome, call_notes } = body

    // Get lead with business name (works whether business_id is set or null — imported leads)
    const { data: lead } = await supabaseAdmin
      .from('crm_leads')
      .select('id, user_id, status, priority, business_id, notes, company_name, businesses(name)')
      .eq('id', params.id).eq('user_id', user.id).single()

    if (!lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })
    const bizName = (lead.businesses as unknown as { name: string } | null)?.name
      ?? (lead as unknown as { company_name?: string }).company_name
      ?? 'Entreprise'

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

    // ── Status change ────────────────────────────────────────
    // IMPORTANT: when a call is being logged (call_outcome present), we always
    // refresh status_changed_at even if the status VALUE didn't change — e.g.
    // logging "Pas de réponse" on a lead that's already "À appeler" should
    // still visibly bump the "last touched" timestamp, not silently no-op.
    const statusActuallyChanges = status !== undefined && status !== lead.status
    if (statusActuallyChanges || (call_outcome && status !== undefined)) {
      updateData.status            = status
      updateData.status_changed_at = new Date().toISOString()

      // Clear callback_date when leaving callback status
      if (lead.status === 'callback' && status !== 'callback') {
        updateData.callback_date = null
        updateData.callback_note = null
      }

      if (statusActuallyChanges) {
        await log(user.id, params.id, bizName, 'status_change',
          STATUS_LABELS[lead.status] ?? lead.status,
          STATUS_LABELS[status] ?? status)
      }
    }

    // ── Callback date ────────────────────────────────────────
    if (callback_date !== undefined) {
      updateData.callback_date = callback_date
      if (callback_note !== undefined) updateData.callback_note = callback_note
      await log(user.id, params.id, bizName, 'callback_set', undefined,
        callback_date ? new Date(callback_date).toLocaleString('fr-FR') : undefined,
        { note: callback_note })
    }

    // ── Priority change ──────────────────────────────────────
    if (priority !== undefined && priority !== lead.priority) {
      updateData.priority = priority
      await log(user.id, params.id, bizName, 'priority_changed',
        lead.priority ?? 'normal', priority)
    }

    // ── Notes update ─────────────────────────────────────────
    if (notes !== undefined && notes !== lead.notes) {
      updateData.notes = notes
      if (notes?.trim()) {
        await log(user.id, params.id, bizName, 'note_added', undefined, undefined, { note: notes.slice(0, 100) })
      }
    }

    // Apply the primary update — this is the action the user is actually
    // waiting on, so its result is checked and any real error is surfaced.
    if (Object.keys(updateData).length > 1) {
      const { error: updateErr } = await supabaseAdmin
        .from('crm_leads').update(updateData).eq('id', params.id)
      if (updateErr) {
        console.error('CRM lead update failed:', updateErr)
        return NextResponse.json({ error: `Échec de la mise à jour: ${updateErr.message}` }, { status: 500 })
      }
    }

    // ── Log a call ───────────────────────────────────────────
    // This is secondary/non-critical relative to the status update above —
    // a failure here must NEVER cause the whole request (and therefore the
    // already-applied status change) to be reported as failed to the user.
    if (call_outcome) {
      try {
        await supabaseAdmin.from('crm_call_logs').insert({
          lead_id: params.id, user_id: user.id,
          outcome: call_outcome, notes: call_notes ?? null,
          called_at: new Date().toISOString(),
        })
      } catch (e) {
        console.error('crm_call_logs insert failed (non-blocking):', e)
      }
      try {
        await supabaseAdmin.from('crm_leads').update({
          last_contacted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq('id', params.id)
      } catch (e) {
        console.error('last_contacted_at update failed (non-blocking):', e)
      }
      await log(user.id, params.id, bizName, 'call_logged', undefined, call_outcome, { notes: call_notes })
    }

    // Return updated lead + its call logs so the frontend can sync exactly
    const { data: updated } = await supabaseAdmin
      .from('crm_leads').select('*, call_logs:crm_call_logs(*)').eq('id', params.id).single()

    return NextResponse.json({ lead: updated })
  } catch (e) {
    console.error('CRM PATCH error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { error } = await supabaseAdmin.from('crm_leads').delete().eq('id', params.id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
