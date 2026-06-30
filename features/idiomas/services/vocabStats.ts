/**
 * KPIs del módulo de idiomas: progreso semanal/diario, vencidas, dominadas,
 * leeches y fechas de práctica (para la racha unificada del home).
 */
import { isDue } from '@/lib/srs'
import { readVocab } from './vocabStorage'
import type { VocabLang, VocabStats } from '../types'

/** Inicio de la semana ISO (lunes 00:00) para `d`. */
function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = (x.getDay() + 6) % 7 // lunes = 0
  x.setDate(x.getDate() - day)
  return x
}

/** Inicio del día (00:00) para `d`. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function ms(iso?: string): number {
  if (!iso) return NaN
  const t = new Date(iso).getTime()
  return isNaN(t) ? NaN : t
}

/**
 * Calcula las métricas del tablero de idiomas.
 * `weeklyGoal`/`dailyGoal` vienen de los ajustes del usuario.
 */
export function getVocabStats(
  now: Date,
  weeklyGoal: number,
  dailyGoal: number,
  lang: VocabLang = 'en',
): VocabStats {
  const items = readVocab(lang)
  const weekStart = startOfWeek(now).getTime()
  const dayStart = startOfDay(now).getTime()

  let weekLearned = 0
  let todayLearned = 0
  let dueToday = 0
  let newAvailable = 0
  let mastered = 0
  let leeches = 0
  const practiceDates: string[] = []

  for (const it of items) {
    const learned = ms(it.learnedAt)
    if (!isNaN(learned)) {
      if (learned >= weekStart) weekLearned++
      if (learned >= dayStart) todayLearned++
    }
    // Categorías mutuamente excluyentes para no doblar el conteo:
    // - "vencidas" = repasos ya iniciados que tocan hoy (NO las nuevas).
    // - "nuevas" = nunca practicadas (entran por el cupo diario).
    if (it.status === 'leech') leeches++
    else if (it.status !== 'new' && isDue(it.srs, now)) dueToday++
    if (it.status === 'new') newAvailable++
    if (it.status === 'known') mastered++
    for (const r of it.reviewHistory) if (r?.date) practiceDates.push(r.date)
  }

  return {
    total: items.length,
    weekLearned,
    weeklyGoal,
    todayLearned,
    dailyGoal,
    dueToday,
    newAvailable,
    mastered,
    leeches,
    practiceDates,
  }
}

/** Solo las fechas de práctica de vocabulario (para sumar a la racha del home). */
export function getVocabPracticeDates(lang: VocabLang = 'en'): string[] {
  const dates: string[] = []
  for (const it of readVocab(lang)) {
    if (it.createdAt) dates.push(it.createdAt)
    for (const r of it.reviewHistory) if (r?.date) dates.push(r.date)
  }
  return dates
}
