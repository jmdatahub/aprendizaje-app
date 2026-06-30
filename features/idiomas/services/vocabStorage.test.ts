import { describe, it, expect } from 'vitest'
import { computeReviewedState, MASTERED_INTERVAL_DAYS, DEFAULT_LEECH_THRESHOLD } from './vocabStorage'
import { initSrs, type SrsState } from '@/lib/srs'

const NOW = new Date('2026-06-29T10:00:00.000Z')

function srs(partial: Partial<SrsState>): SrsState {
  return { reps: 0, intervalDays: 0, ease: 2.5, dueDate: NOW.toISOString(), lastReviewed: null, ...partial }
}

describe('computeReviewedState', () => {
  it('marca learnedAt en el primer acierto y deja la palabra en "learning"', () => {
    const r = computeReviewedState(
      { srs: initSrs(NOW), lapses: 0, status: 'new' },
      'good',
      NOW,
    )
    expect(r.learnedAt).toBe(NOW.toISOString())
    expect(r.status).toBe('learning')
    expect(r.masteredAt).toBeUndefined()
  })

  it('NO marca learnedAt si la primera respuesta es "again"', () => {
    const r = computeReviewedState({ srs: initSrs(NOW), lapses: 0, status: 'new' }, 'again', NOW)
    expect(r.learnedAt).toBeUndefined()
    expect(r.lapses).toBe(1)
  })

  it('marca "known" cuando el intervalo alcanza el umbral de dominio', () => {
    // reps=2, intervalDays=10, ease=2.5 -> good -> interval = 25 (>= 21)
    const r = computeReviewedState(
      { srs: srs({ reps: 2, intervalDays: 10, ease: 2.5, lastReviewed: NOW.toISOString() }), lapses: 0, status: 'learning' },
      'good',
      NOW,
    )
    expect(r.srs.intervalDays).toBeGreaterThanOrEqual(MASTERED_INTERVAL_DAYS)
    expect(r.masteredAt).toBe(NOW.toISOString())
    expect(r.status).toBe('known')
  })

  it('promociona a "leech" al alcanzar el umbral de fallos', () => {
    const r = computeReviewedState(
      { srs: srs({ reps: 1, intervalDays: 3, lastReviewed: NOW.toISOString() }), lapses: DEFAULT_LEECH_THRESHOLD - 1, status: 'learning' },
      'again',
      NOW,
    )
    expect(r.lapses).toBe(DEFAULT_LEECH_THRESHOLD)
    expect(r.status).toBe('leech')
  })

  it('re-degrada una palabra "known" a "leech" si se vuelve a fallar mucho (leech > known)', () => {
    const r = computeReviewedState(
      {
        srs: srs({ reps: 5, intervalDays: 60, lastReviewed: NOW.toISOString() }),
        lapses: DEFAULT_LEECH_THRESHOLD - 1,
        status: 'known',
        masteredAt: '2026-06-01T00:00:00.000Z',
      },
      'again',
      NOW,
    )
    expect(r.status).toBe('leech')
  })
})
