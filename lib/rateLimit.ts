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

export function rateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): { success: boolean; remaining: number } {
  const now = Date.now()
  maybeCleanup(now)
  const windowMs = windowSeconds * 1000

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: maxRequests - 1 }
  }

  if (entry.count >= maxRequests) {
    return { success: false, remaining: 0 }
  }

  entry.count++
  return { success: true, remaining: maxRequests - entry.count }
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
