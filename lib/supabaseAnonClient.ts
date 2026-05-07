import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client using the public anon key. Safe to share across
 * route handlers — Supabase JS client is stateless. We cache one instance per
 * Lambda warm container to avoid the createClient cost on every request.
 *
 * Use this in API routes that don't need request-scoped auth context. For
 * routes that should use the user's JWT, see lib/supabaseRoute.ts.
 *
 * Throws if env vars are missing — callers should let this propagate to a 500.
 */
let cached: SupabaseClient | null = null

export function getSupabaseAnon(): SupabaseClient {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}

/**
 * Server-side Supabase client using the service-role key when available,
 * else falls back to anon. Only use this in trusted contexts (cron jobs,
 * webhooks with verified secrets) — service role bypasses RLS.
 */
let cachedAdmin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  cachedAdmin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cachedAdmin
}
