import { createClient } from '@supabase/supabase-js'

// Admin client uses SERVICE_ROLE_KEY — NEVER expose to browser.
// Only import this in server-side API routes.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
