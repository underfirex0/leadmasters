import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Navbar from '@/components/Navbar'
import type { Profile } from '@/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profileData } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, credit_balance, plan_id, is_admin')
    .eq('id', session.user.id)
    .single()

  if (!profileData) redirect('/login')

  const profile = profileData as unknown as Profile & { plan_id?: string; is_admin?: boolean }

  // Background renewal check
  try {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions').select('current_period_end, status')
      .eq('user_id', session.user.id).eq('status', 'active').single()
    if (sub?.current_period_end && new Date(sub.current_period_end) < new Date()) {
      await supabaseAdmin.rpc('process_subscription_renewal', { p_user_id: session.user.id })
    }
  } catch {}

  return (
    <div className="min-h-screen bg-surface-1">
      <Navbar profile={profile} />
      <main className="max-w-[1400px] mx-auto px-5 py-8">
        {children}
      </main>
    </div>
  )
}
