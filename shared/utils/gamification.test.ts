import { describe, it, expect } from 'vitest'
import { calculateGamificationStats } from './gamification'

/** ISO string for `n` days before now (local). */
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

describe('calculateGamificationStats', () => {
  it('returns zeros for empty input', () => {
    expect(calculateGamificationStats([])).toEqual({
      currentStreak: 0,
      uniqueDaysThisYear: 0,
      isTodayLearned: false,
    })
  })

  it('counts a single learning today as streak 1', () => {
    const s = calculateGamificationStats([daysAgo(0)])
    expect(s.currentStreak).toBe(1)
    expect(s.isTodayLearned).toBe(true)
  })

  it('counts consecutive days as a streak', () => {
    const s = calculateGamificationStats([daysAgo(0), daysAgo(1), daysAgo(2)])
    expect(s.currentStreak).toBe(3)
  })

  it('keeps an active streak when the most recent day is yesterday (not today)', () => {
    const s = calculateGamificationStats([daysAgo(1), daysAgo(2)])
    expect(s.currentStreak).toBe(2)
    expect(s.isTodayLearned).toBe(false)
  })

  it('breaks the streak across a gap', () => {
    const s = calculateGamificationStats([daysAgo(0), daysAgo(1), daysAgo(5)])
    expect(s.currentStreak).toBe(2)
  })

  it('returns 0 streak when the latest day is older than yesterday', () => {
    const s = calculateGamificationStats([daysAgo(3), daysAgo(4)])
    expect(s.currentStreak).toBe(0)
  })

  it('deduplicates multiple learnings on the same day', () => {
    const s = calculateGamificationStats([daysAgo(0), daysAgo(0), daysAgo(0)])
    expect(s.currentStreak).toBe(1)
    expect(s.uniqueDaysThisYear).toBe(1)
  })

  it('ignores invalid dates without crashing', () => {
    const s = calculateGamificationStats(['not-a-date', daysAgo(0)])
    expect(s.currentStreak).toBe(1)
  })

  it('accepts Date objects as well as strings', () => {
    const s = calculateGamificationStats([new Date()])
    expect(s.isTodayLearned).toBe(true)
    expect(s.currentStreak).toBe(1)
  })
})
