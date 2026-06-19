import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import AdminShell from '@/components/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('is_admin, full_name, email').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

  // Count pending subscriptions for badge
  const { count: pendingCount } = await supabaseAdmin
    .from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'pending')

  // Count pending data import requests
  const { count: importsCount } = await supabaseAdmin
    .from('data_upload_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')

  return (
    <AdminShell
      name={profile.full_name ?? ''}
      email={profile.email ?? ''}
      pendingCount={pendingCount ?? 0}
      importsCount={importsCount ?? 0}
    >
      {children}
    </AdminShell>
  )
}
