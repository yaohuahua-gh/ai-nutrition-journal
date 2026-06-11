import { createClient } from '@supabase/supabase-js'

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export function getSupabaseAdmin() {
  if (!hasSupabaseEnv()) return null
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
  })
}

export function demoUserId() {
  return process.env.DEMO_USER_ID || '00000000-0000-0000-0000-000000000001'
}
