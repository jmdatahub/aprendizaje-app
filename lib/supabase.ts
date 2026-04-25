import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const disableSupabase = process.env.DISABLE_SUPABASE === '1'

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey) && !disableSupabase

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase disabled or env vars missing — falling back to noop client')
}

/**
 * Build a "noop" stub that mimics the chained Supabase query API.
 * Every terminal await resolves to { data: [], error: null } so API routes
 * keep returning 200 with empty data instead of crashing the UI with 500s.
 * Used when env vars are missing.
 */
function createNoopClient(): SupabaseClient {
  const proxy: any = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') {
        return (resolve: (v: any) => void) => resolve({ data: [], error: null })
      }
      if (prop === 'single' || prop === 'maybeSingle') {
        return () => Promise.resolve({ data: null, error: null })
      }
      if (prop === 'auth') {
        return {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          signInWithOtp: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
          signOut: () => Promise.resolve({ error: null }),
        }
      }
      return proxy
    },
    apply() {
      return proxy
    },
  })
  return proxy as SupabaseClient
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createNoopClient()
