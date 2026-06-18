import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import AdminNav from '@/components/AdminNav'

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
    <div className="min-h-screen bg-surface-1 flex">
      <aside className="w-56 bg-white border-r border-[rgba(0,0,0,0.06)] flex flex-col sticky top-0 h-screen overflow-hidden">
        <AdminNav
          name={profile.full_name ?? ''}
          email={profile.email ?? ''}
          pendingCount={pendingCount ?? 0}
          importsCount={importsCount ?? 0}
        />
      </aside>
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-[1400px] mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
