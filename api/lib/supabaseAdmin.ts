import { createClient } from '@supabase/supabase-js'

let cachedClient: any = null

export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase admin env vars')
  }

  cachedClient = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return cachedClient
}
