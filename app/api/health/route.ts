import { NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { isStubMode } from '@/lib/openai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Health check endpoint. Returns 200 with service status, 503 if any critical
 * dependency is unhealthy. Useful for uptime monitoring (UptimeRobot, etc.)
 * and to keep the Supabase project active (free tier pauses after 7 days idle).
 */
export async function GET() {
  const startedAt = Date.now()
  const checks: Record<string, { ok: boolean; ms?: number; detail?: string }> = {
    server: { ok: true },
    supabase: { ok: false },
  }

  // Supabase reachability — never leak DB error details to clients
  if (!isSupabaseConfigured) {
    checks.supabase = { ok: false }
  } else {
    const t0 = Date.now()
    try {
      const { error } = await supabase.from('aprendizajes').select('id').limit(1)
      if (error) {
        console.error('[health] supabase error:', error.message)
        checks.supabase = { ok: false, ms: Date.now() - t0 }
      } else {
        checks.supabase = { ok: true, ms: Date.now() - t0 }
      }
    } catch (e) {
      console.error('[health] supabase exception:', e instanceof Error ? e.message : String(e))
      checks.supabase = { ok: false, ms: Date.now() - t0 }
    }
  }

  checks.openai = { ok: !isStubMode() }

  const allCritical = checks.server.ok && checks.supabase.ok
  const status = allCritical ? 200 : 503

  return NextResponse.json(
    {
      status: allCritical ? 'ok' : 'degraded',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks,
      durationMs: Date.now() - startedAt,
    },
    { status }
  )
}
