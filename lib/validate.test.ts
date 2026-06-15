import { describe, it, expect } from 'vitest'
import {
  isValidUUID,
  isValidRouteId,
  isValidTelegramChatId,
  sanitizeString,
  validatePositiveInt,
  validateNumberInRange,
  validateRequiredString,
  validateOptionalString,
  safeEqual,
  escapeLikeWildcards,
} from './validate'

describe('isValidUUID', () => {
  it('accepts a well-formed uuid', () => {
    expect(isValidUUID('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(true)
  })
  it('rejects malformed, empty, non-string, and injection attempts', () => {
    expect(isValidUUID('123')).toBe(false)
    expect(isValidUUID('')).toBe(false)
    expect(isValidUUID(null)).toBe(false)
    expect(isValidUUID(123)).toBe(false)
    expect(isValidUUID("3f2504e0-4f89-41d3-9a0c-0305e82c3301'; DROP TABLE x;--")).toBe(false)
  })
})

describe('isValidRouteId', () => {
  it('accepts uuids and small positive integers', () => {
    expect(isValidRouteId('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(true)
    expect(isValidRouteId('1')).toBe(true)
    expect(isValidRouteId('9999')).toBe(true)
  })
  it('rejects sql-ish, zero/negative, oversized and non-numeric input', () => {
    expect(isValidRouteId('1 OR 1=1')).toBe(false)
    expect(isValidRouteId('0')).toBe(false)
    expect(isValidRouteId('-5')).toBe(false)
    expect(isValidRouteId('a'.repeat(100))).toBe(false)
    expect(isValidRouteId(5)).toBe(false)
  })
})

describe('isValidTelegramChatId', () => {
  it('accepts numeric ids including negative group ids', () => {
    expect(isValidTelegramChatId('123456')).toBe(true)
    expect(isValidTelegramChatId('-100123456')).toBe(true)
  })
  it('rejects non-numeric and empty', () => {
    expect(isValidTelegramChatId('abc')).toBe(false)
    expect(isValidTelegramChatId('')).toBe(false)
    expect(isValidTelegramChatId(123)).toBe(false)
  })
})

describe('sanitizeString', () => {
  it('trims and returns valid strings', () => {
    expect(sanitizeString('  hello  ', 10)).toBe('hello')
  })
  it('rejects empty/whitespace, too-long and non-strings', () => {
    expect(sanitizeString('   ', 10)).toBe(null)
    expect(sanitizeString('x'.repeat(11), 10)).toBe(null)
    expect(sanitizeString(42, 10)).toBe(null)
  })
})

describe('validatePositiveInt', () => {
  it('accepts integers within [1, max]', () => {
    expect(validatePositiveInt('5', 10)).toBe(5)
    expect(validatePositiveInt(1, 10)).toBe(1)
  })
  it('rejects zero, out-of-range, decimals and junk', () => {
    expect(validatePositiveInt(0, 10)).toBe(null)
    expect(validatePositiveInt(11, 10)).toBe(null)
    expect(validatePositiveInt(1.5, 10)).toBe(null)
    expect(validatePositiveInt('abc', 10)).toBe(null)
  })
})

describe('validateNumberInRange', () => {
  it('accepts numbers (incl. zero and decimals) within range', () => {
    expect(validateNumberInRange(0, 0, 100)).toBe(0)
    expect(validateNumberInRange('3.5', 0, 100)).toBe(3.5)
  })
  it('rejects out-of-range and non-finite values', () => {
    expect(validateNumberInRange(-1, 0, 100)).toBe(null)
    expect(validateNumberInRange(101, 0, 100)).toBe(null)
    expect(validateNumberInRange('nope', 0, 100)).toBe(null)
    expect(validateNumberInRange(Infinity, 0, 100)).toBe(null)
  })
})

describe('validateRequiredString', () => {
  it('accepts a trimmed non-empty string within bound', () => {
    expect(validateRequiredString('  hi  ', 10)).toEqual({ ok: true, value: 'hi' })
  })
  it('rejects empty, undefined, wrong type and too-long', () => {
    expect(validateRequiredString('', 10).ok).toBe(false)
    expect(validateRequiredString(undefined, 10).ok).toBe(false)
    expect(validateRequiredString(5, 10).ok).toBe(false)
    expect(validateRequiredString('x'.repeat(11), 10).ok).toBe(false)
  })
})

describe('validateOptionalString', () => {
  it('allows undefined/null (value undefined) and valid strings', () => {
    expect(validateOptionalString(undefined, 10)).toEqual({ ok: true, value: undefined })
    expect(validateOptionalString(null, 10)).toEqual({ ok: true, value: undefined })
    expect(validateOptionalString('hi', 10)).toEqual({ ok: true, value: 'hi' })
  })
  it('rejects wrong type and too-long', () => {
    expect(validateOptionalString(5, 10).ok).toBe(false)
    expect(validateOptionalString('x'.repeat(11), 10).ok).toBe(false)
  })
})

describe('safeEqual', () => {
  it('is true only for equal same-length strings', () => {
    expect(safeEqual('secret', 'secret')).toBe(true)
    expect(safeEqual('secret', 'secres')).toBe(false)
    expect(safeEqual('secret', 'secre')).toBe(false)
  })
  it('returns false for nullish or non-string input', () => {
    expect(safeEqual(null, null)).toBe(false)
    expect(safeEqual('a', undefined)).toBe(false)
    expect(safeEqual(undefined, undefined)).toBe(false)
  })
})

describe('escapeLikeWildcards', () => {
  it('escapes %, _ and backslash so they are treated literally', () => {
    expect(escapeLikeWildcards('50%_x\\')).toBe('50\\%\\_x\\\\')
    expect(escapeLikeWildcards('plain')).toBe('plain')
  })
})
