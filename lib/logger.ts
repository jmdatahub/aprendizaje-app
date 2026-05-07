/**
 * Tiny structured logger for server-side code. Outputs JSON lines in
 * production (Vercel ingests these into log search) and pretty lines in
 * development.
 *
 * Usage:
 *   const log = createLogger('api/chat', { requestId })
 *   log.info('rate limit ok')
 *   log.error('openai failed', { err: e?.message })
 *
 * Request ID:
 *   - Pulls from x-request-id / x-vercel-id header
 *   - Else generates a short random id
 */
import { randomBytes } from 'crypto'

type Level = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_PRIORITY: Record<Level, number> = {
  debug: 0, info: 1, warn: 2, error: 3,
}

function getMinLevel(): Level {
  const l = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')).toLowerCase()
  return (['debug', 'info', 'warn', 'error'] as Level[]).includes(l as Level) ? (l as Level) : 'info'
}
const MIN = LEVEL_PRIORITY[getMinLevel()]

function shortId(): string {
  return randomBytes(4).toString('hex')
}

export function getRequestId(req?: Request | { headers: Headers }): string {
  if (!req) return shortId()
  const h = (req as Request).headers
  return h.get('x-request-id') || h.get('x-vercel-id') || shortId()
}

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void
  info(msg: string, meta?: Record<string, unknown>): void
  warn(msg: string, meta?: Record<string, unknown>): void
  error(msg: string, meta?: Record<string, unknown>): void
  child(extra: Record<string, unknown>): Logger
}

const isProd = process.env.NODE_ENV === 'production'

function emit(level: Level, scope: string, baseCtx: Record<string, unknown>, msg: string, meta?: Record<string, unknown>) {
  if (LEVEL_PRIORITY[level] < MIN) return
  const ctx = { ...baseCtx, ...(meta || {}) }
  if (isProd) {
    // JSON one-liner — Vercel-friendly
    const record = { ts: new Date().toISOString(), level, scope, msg, ...ctx }
    // route to right console method so Vercel surfaces severity
    const s = JSON.stringify(record)
    if (level === 'error') console.error(s)
    else if (level === 'warn') console.warn(s)
    else console.log(s)
  } else {
    const tag = `[${scope}]`
    const ctxStr = Object.keys(ctx).length ? ' ' + JSON.stringify(ctx) : ''
    const line = `${level.toUpperCase()} ${tag} ${msg}${ctxStr}`
    if (level === 'error') console.error(line)
    else if (level === 'warn') console.warn(line)
    else console.log(line)
  }
}

export function createLogger(scope: string, baseCtx: Record<string, unknown> = {}): Logger {
  return {
    debug: (msg, meta) => emit('debug', scope, baseCtx, msg, meta),
    info:  (msg, meta) => emit('info',  scope, baseCtx, msg, meta),
    warn:  (msg, meta) => emit('warn',  scope, baseCtx, msg, meta),
    error: (msg, meta) => emit('error', scope, baseCtx, msg, meta),
    child: (extra) => createLogger(scope, { ...baseCtx, ...extra }),
  }
}
