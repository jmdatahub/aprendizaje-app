import { describe, it, expect } from 'vitest'
import { initSrs, reviewSrs, isDue, daysUntilDue, type SrsState } from './srs'

const MS_PER_DAY = 1000 * 60 * 60 * 24
const NOW = new Date('2026-06-15T10:00:00.000Z')
const addDays = (base: Date, days: number) => new Date(base.getTime() + days * MS_PER_DAY)

describe('initSrs', () => {
  it('creates a fresh state due immediately with default ease', () => {
    const s = initSrs(NOW)
    expect(s.reps).toBe(0)
    expect(s.intervalDays).toBe(0)
    expect(s.ease).toBe(2.5)
    expect(s.lastReviewed).toBeNull()
    expect(s.dueDate).toBe(NOW.toISOString())
    // due immediately => isDue true at creation time
    expect(isDue(s, NOW)).toBe(true)
  })
})

describe('reviewSrs — good', () => {
  it('first good review schedules 1 day out and sets a future dueDate', () => {
    const s = reviewSrs(initSrs(NOW), 'good', NOW)
    expect(s.reps).toBe(1)
    expect(s.intervalDays).toBe(1)
    expect(s.lastReviewed).toBe(NOW.toISOString())
    expect(new Date(s.dueDate).getTime()).toBeGreaterThan(NOW.getTime())
    expect(s.dueDate).toBe(addDays(NOW, 1).toISOString())
  })

  it('second good review schedules 3 days out', () => {
    const s1 = reviewSrs(initSrs(NOW), 'good', NOW)
    const s2 = reviewSrs(s1, 'good', NOW)
    expect(s2.reps).toBe(2)
    expect(s2.intervalDays).toBe(3)
  })

  it('subsequent good reviews grow the interval by ease (interval increases over time)', () => {
    let s = reviewSrs(initSrs(NOW), 'good', NOW) // 1d
    s = reviewSrs(s, 'good', NOW) // 3d
    const prevInterval = s.intervalDays
    s = reviewSrs(s, 'good', NOW) // 3 * 2.5 = 7.5 -> 8
    expect(s.reps).toBe(3)
    expect(s.intervalDays).toBeGreaterThan(prevInterval)
    expect(s.intervalDays).toBe(Math.round(3 * 2.5))
  })

  it('good keeps ease unchanged', () => {
    const s = reviewSrs(initSrs(NOW), 'good', NOW)
    expect(s.ease).toBe(2.5)
  })
})

describe('reviewSrs — easy', () => {
  it('easy raises ease and applies a bonus to the interval', () => {
    const good = reviewSrs(initSrs(NOW), 'good', NOW)
    const easy = reviewSrs(initSrs(NOW), 'easy', NOW)
    expect(easy.ease).toBeGreaterThan(good.ease)
    // first review interval base is 1 day; easy bonus makes it >= good's
    expect(easy.intervalDays).toBeGreaterThanOrEqual(good.intervalDays)
  })
})

describe('reviewSrs — again', () => {
  it('resets reps to 0, interval to 1 day, and lowers ease', () => {
    // build up some progress first
    let s = reviewSrs(initSrs(NOW), 'good', NOW)
    s = reviewSrs(s, 'good', NOW)
    s = reviewSrs(s, 'good', NOW)
    const before = s.ease
    const after = reviewSrs(s, 'again', NOW)
    expect(after.reps).toBe(0)
    expect(after.intervalDays).toBe(1)
    expect(after.ease).toBeLessThan(before)
    expect(after.dueDate).toBe(addDays(NOW, 1).toISOString())
  })
})

describe('ease clamping', () => {
  it('never drops below 1.3 after many again reviews', () => {
    let s: SrsState | undefined = initSrs(NOW)
    for (let i = 0; i < 20; i++) s = reviewSrs(s, 'again', NOW)
    expect(s!.ease).toBeGreaterThanOrEqual(1.3)
    expect(s!.ease).toBe(1.3)
  })

  it('never rises above 3.0 after many easy reviews', () => {
    let s: SrsState | undefined = initSrs(NOW)
    for (let i = 0; i < 20; i++) s = reviewSrs(s, 'easy', NOW)
    expect(s!.ease).toBeLessThanOrEqual(3.0)
    expect(s!.ease).toBe(3.0)
  })
})

describe('reviewSrs — undefined input', () => {
  it('treats undefined state as a fresh init and still schedules', () => {
    const s = reviewSrs(undefined, 'good', NOW)
    expect(s.reps).toBe(1)
    expect(s.intervalDays).toBe(1)
    expect(s.lastReviewed).toBe(NOW.toISOString())
  })
})

describe('isDue', () => {
  it('returns false for undefined state (old learnings never scheduled)', () => {
    expect(isDue(undefined, NOW)).toBe(false)
  })

  it('is false before the dueDate and true on/after it', () => {
    const s = reviewSrs(initSrs(NOW), 'good', NOW) // due in 1 day
    expect(isDue(s, NOW)).toBe(false)
    expect(isDue(s, addDays(NOW, 1))).toBe(true)
    expect(isDue(s, addDays(NOW, 5))).toBe(true)
  })

  it('returns false for a malformed dueDate', () => {
    const broken = { ...initSrs(NOW), dueDate: 'not-a-date' }
    expect(isDue(broken, NOW)).toBe(false)
  })
})

describe('daysUntilDue', () => {
  it('returns 0 for undefined state', () => {
    expect(daysUntilDue(undefined, NOW)).toBe(0)
  })

  it('returns a positive count when the item is scheduled in the future', () => {
    const s = reviewSrs(initSrs(NOW), 'good', NOW) // due in 1 day
    expect(daysUntilDue(s, NOW)).toBe(1)
  })

  it('returns a non-positive count when overdue', () => {
    const s = reviewSrs(initSrs(NOW), 'good', NOW) // due in 1 day
    expect(daysUntilDue(s, addDays(NOW, 3))).toBeLessThanOrEqual(0)
  })
})
