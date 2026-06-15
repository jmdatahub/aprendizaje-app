import { describe, it, expect } from 'vitest'
import { rateLimitSync, getClientIp } from './rateLimit'

// Note: rateLimitSync uses a module-level in-memory store, so each test uses a
// unique key to avoid cross-test interference.

describe('rateLimitSync', () => {
  it('allows up to max requests then blocks within the window', () => {
    const key = 'rl-block'
    const max = 3
    expect(rateLimitSync(key, max, 60).success).toBe(true)
    expect(rateLimitSync(key, max, 60).success).toBe(true)
    const third = rateLimitSync(key, max, 60)
    expect(third.success).toBe(true)
    expect(third.remaining).toBe(0)
    expect(rateLimitSync(key, max, 60).success).toBe(false)
  })

  it('reports remaining count correctly', () => {
    const key = 'rl-remaining'
    expect(rateLimitSync(key, 5, 60).remaining).toBe(4)
    expect(rateLimitSync(key, 5, 60).remaining).toBe(3)
  })

  it('isolates limits between different keys', () => {
    expect(rateLimitSync('rl-a', 1, 60).success).toBe(true)
    expect(rateLimitSync('rl-a', 1, 60).success).toBe(false)
    expect(rateLimitSync('rl-b', 1, 60).success).toBe(true)
  })

  it('resets after the window expires', async () => {
    const key = 'rl-expire'
    expect(rateLimitSync(key, 1, 1).success).toBe(true)
    expect(rateLimitSync(key, 1, 1).success).toBe(false)
    await new Promise((r) => setTimeout(r, 1100))
    expect(rateLimitSync(key, 1, 1).success).toBe(true)
  })
})

describe('getClientIp', () => {
  it('prefers the trusted x-real-ip header', () => {
    const req = new Request('http://x', {
      headers: { 'x-real-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9' },
    })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('falls back to the left-most x-forwarded-for entry', () => {
    const req = new Request('http://x', {
      headers: { 'x-forwarded-for': '5.6.7.8, 10.0.0.1' },
    })
    expect(getClientIp(req)).toBe('5.6.7.8')
  })

  it('returns "unknown" when no ip headers are present', () => {
    expect(getClientIp(new Request('http://x'))).toBe('unknown')
  })

  it('bounds the returned ip length', () => {
    const req = new Request('http://x', { headers: { 'x-real-ip': 'a'.repeat(200) } })
    expect(getClientIp(req).length).toBeLessThanOrEqual(64)
  })
})
