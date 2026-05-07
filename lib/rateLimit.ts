/**
 * Rate limiter with two backends:
 *
 *  1) **In-memory** (default) — uses a per-process Map. Cheap and works fine
 *     for personal/low-traffic. On Vercel, each Lambda has its own Map, so
 *     limits are best-effort across instances.
 *
 *  2) **Upstash Redis REST** — distributed limiter using a fixed window with
 *     atomic INCR + EXPIRE via the Upstash REST API. Activated automatically
 *     when both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env
 *     vars are set. No new dependencies — uses fetch.
 *
 * Both backends share the same signature so call sites don't change.
 *
 * The function returns `Promise<{ success, remaining }>` — call sites already
 * use `await` thanks to async, but the in-memory path resolves synchronously.
 */

const store = new Map<string, { count: number; resetAt: number }>()

// Periodic cleanup to bound memory: every 1000 inserts, sweep expired entries.
let opsSinceSweep = 0
function maybeCleanup(now: number) {
  if (++opsSinceSweep < 1000) return
  opsSinceSweep = 0
  for (const [k, v] of store.entries()) {
    if (now > v.resetAt) store.delete(k)
  }
  // Hard cap: if we still have too many entries, drop oldest ~25%
  if (store.size > 10_000) {
    const entries = [...store.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt)
    const toDrop = Math.floor(entries.length / 4)
    for (let i = 0; i < toDrop; i++) store.delete(entries[i][0])
  }
}

function rateLimitMemory(key: string, max: number, windowSec: number) {
  const now = Date.now()
  maybeCleanup(now)
  const windowMs = windowSec * 1000

  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: max - 1 }
  }
  if (entry.count >= max) {
    return { success: false, remaining: 0 }
  }
  entry.count++
  return { success: true, remaining: max - entry.count }
}

/**
 * Upstash Redis REST limiter — fixed window. Single round-trip pipeline:
 * INCR + EXPIRE (NX) — keeps each window's first request atomic-ish.
 *
 * If Upstash returns a network error, we **fail open** (allow the request)
 * to avoid degrading availability when Redis hiccups. Logs to console.
 */
async function rateLimitUpstash(
  url: string,
  token: string,
  key: string,
  max: number,
  windowSec: number
): Promise<{ success: boolean; remaining: number }> {
  const fullKey = `rl:${key}`
  // Pipeline: [["INCR","rl:k"], ["EXPIRE","rl:k", "60", "NX"]]
  const body = JSON.stringify([
    ['INCR', fullKey],
    ['EXPIRE', fullKey, String(windowSec), 'NX'],
  ])
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body,
      // Keep this snappy — never block the request more than ~200ms.
      signal: AbortSignal.timeout?.(200),
    })
    if (!res.ok) throw new Error('upstash status ' + res.status)
    const json = (await res.json()) as Array<{ result: number | string }>
    const count = Number(json?.[0]?.result ?? 0)
    if (!Number.isFinite(count) || count <= 0) {
      return { success: true, remaining: max - 1 }
    }
    if (count > max) return { success: false, remaining: 0 }
    return { success: true, remaining: max - count }
  } catch (err: any) {
    // Fail-open with a console warning so rate limit can't take the whole API down.
    console.warn('[rateLimit] Upstash unavailable, falling back to allow:', err?.message || 'unknown')
    return { success: true, remaining: max - 1 }
  }
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const useUpstash = !!(UPSTASH_URL && UPSTASH_TOKEN)

/**
 * Async-only public API. Existing callers without `await` should be migrated;
 * with the in-memory backend the result is resolved synchronously so the
 * difference is invisible to behavior, only to types.
 */
export async function rateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ success: boolean; remaining: number }> {
  if (useUpstash) {
    return rateLimitUpstash(UPSTASH_URL!, UPSTASH_TOKEN!, key, maxRequests, windowSeconds)
  }
  return rateLimitMemory(key, maxRequests, windowSeconds)
}

/**
 * Synchronous fallback — only safe with the in-memory backend. Used by the
 * existing call sites that haven't been migrated to await yet. If Upstash is
 * configured this STILL uses memory (so prod is exact when migrated).
 */
export function rateLimitSync(
  key: string,
  maxRequests: number,
  windowSeconds: number
): { success: boolean; remaining: number } {
  return rateLimitMemory(key, maxRequests, windowSeconds)
}

/**
 * Returns a best-effort client identifier. NOTE: in production behind Vercel,
 * trust only the Vercel-set headers. `x-forwarded-for` can be spoofed if the
 * app is exposed directly. We take the FIRST entry (left-most) — that's the
 * client per RFC, but the proxy chain controls trust.
 */
export function getClientIp(request: Request): string {
  // Vercel-specific (most trustworthy on Vercel deployments)
  const vercelIp = request.headers.get('x-real-ip') || request.headers.get('x-vercel-forwarded-for')
  if (vercelIp) return vercelIp.split(',')[0].trim().slice(0, 64)

  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim().slice(0, 64)

  return 'unknown'
}
