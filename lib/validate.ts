import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

/**
 * Constant-time string equality. Returns false on length mismatch (length is
 * unavoidably leaked but that's universal across all timing-safe schemes).
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

/**
 * Verify a Bearer token from an Authorization header against an expected secret
 * using constant-time comparison.
 */
export function verifyBearer(authHeader: string | null, expected: string | undefined): boolean {
  if (!expected) return false
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  const provided = authHeader.slice(7)
  return safeEqual(provided, expected)
}

export const LIMITS = {
  nombre: 255,
  descripcion: 2000,
  texto: 5000,
  mensaje: 4000,
  uuid: 36,
  chatId: 20,
  searchQuery: 100,
  messages: 100,
} as const

export function isValidUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Accept either a UUID or a small positive integer (≤ 10 digits) as a valid
 * route param id. Anything else (strings with SQL chars, super-long input,
 * negative numbers) is rejected. Tables in this app use UUID for newer entities
 * and integer for older ones (aprendizajes), so the route can't always know.
 */
export function isValidRouteId(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (value.length === 0 || value.length > 64) return false
  return isValidUUID(value) || /^[1-9]\d{0,9}$/.test(value)
}

export function isValidTelegramChatId(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return /^-?\d{1,20}$/.test(value)
}

export function sanitizeString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > maxLength) return null
  return trimmed
}

export function validatePositiveInt(value: unknown, max = 1000): number | null {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > max) return null
  return n
}

export function badRequest(message: string) {
  return NextResponse.json({ success: false, error: 'INVALID_REQUEST', message }, { status: 400 })
}

export function serverError() {
  return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: 'An internal error occurred' }, { status: 500 })
}

export function unauthorized() {
  return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
}

export function escapeLikeWildcards(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&')
}
