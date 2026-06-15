/**
 * Capa de "repaso unificado".
 *
 * La app tenía DOS señales independientes de que un aprendizaje toca repasar hoy:
 *   1. SRS vencido (`isDue`, lib/srs) — repetición espaciada por item.
 *   2. `decayed_items` — preguntas falladas en el test semanal.
 *
 * Este módulo las combina en UN único concepto coherente de "Repasar hoy", para
 * que home, la lista de aprendizajes, la vista por sector y la sesión guiada se
 * comporten igual y midan lo mismo. Todo es client-side (localStorage) y aditivo.
 */
import { isDue, reviewSrs, type SrsState, type ReviewGrade } from '@/lib/srs'
import { SECTORES_DATA } from '@/shared/constants/sectores'

export interface ReviewItem {
  id: string
  title: string
  summary: string
  content?: string
  srs?: SrsState
  reviewHistory?: { date: string }[]
  sectorId: string
  sectorKey: string
  sectorIcon: string
}

/** IDs de aprendizajes marcados como pendientes por fallo en el test semanal. */
export function getDecayedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = JSON.parse(localStorage.getItem('decayed_items') || '[]')
    return new Set<string>(Array.isArray(raw) ? raw : [])
  } catch {
    return new Set()
  }
}

/** ¿Necesita repaso hoy? = SRS vencido O pendiente del test semanal. */
export function needsReview(
  item: { id: string; srs?: SrsState },
  decayed: Set<string>,
  now: Date = new Date()
): boolean {
  return isDue(item.srs, now) || decayed.has(item.id)
}

/**
 * Carga TODOS los aprendizajes que necesitan repaso hoy, de todos los sectores.
 * Ordena por "urgencia": primero los vencidos hace más tiempo (dueDate más antigua),
 * luego los pendientes del test sin SRS programado.
 */
export function loadDueReviewItems(now: Date = new Date()): ReviewItem[] {
  if (typeof window === 'undefined') return []
  const decayed = getDecayedIds()
  const out: ReviewItem[] = []

  for (const sector of SECTORES_DATA) {
    try {
      const stored = localStorage.getItem(`sector_data_${sector.id}`)
      if (!stored) continue
      const data = JSON.parse(stored)
      const items = Array.isArray(data?.items) ? data.items : []
      for (const it of items) {
        if (!it?.id) continue
        if (needsReview(it, decayed, now)) {
          out.push({
            id: it.id,
            title: it.title ?? 'Aprendizaje',
            summary: it.summary ?? '',
            content: it.content,
            srs: it.srs,
            reviewHistory: it.reviewHistory,
            sectorId: sector.id,
            sectorKey: sector.key,
            sectorIcon: sector.icono,
          })
        }
      }
    } catch {
      /* sector corrupto: lo saltamos sin romper el resto */
    }
  }

  // Más vencido primero (dueDate más antigua). Sin SRS => al final.
  out.sort((a, b) => {
    const ta = a.srs ? new Date(a.srs.dueDate).getTime() : Infinity
    const tb = b.srs ? new Date(b.srs.dueDate).getTime() : Infinity
    return ta - tb
  })
  return out
}

/** Nº de aprendizajes que necesitan repaso hoy (para contadores/insignias). */
export function countDueReviewItems(now: Date = new Date()): number {
  return loadDueReviewItems(now).length
}

/**
 * Aplica el resultado de un repaso a un item y lo PERSISTE en localStorage:
 *  - recalcula el SRS (campo `srs`) y añade una entrada a `reviewHistory`,
 *  - lo elimina de `decayed_items` (deja de estar "pendiente").
 *
 * Centraliza la escritura para que todas las vistas (home, lista, por-sector,
 * sesión guiada) se comporten de forma idéntica. Devuelve el nuevo SrsState.
 */
export function applyReview(
  sectorId: string,
  itemId: string,
  grade: ReviewGrade,
  now: Date = new Date()
): SrsState | null {
  if (typeof window === 'undefined') return null
  let newSrs: SrsState | null = null

  try {
    const key = `sector_data_${sectorId}`
    const stored = localStorage.getItem(key)
    if (stored) {
      const data = JSON.parse(stored)
      if (data && Array.isArray(data.items)) {
        data.items = data.items.map((it: { id: string; srs?: SrsState; reviewHistory?: { date: string }[] }) => {
          if (it.id !== itemId) return it
          newSrs = reviewSrs(it.srs, grade, now)
          const reviewHistory = [...(it.reviewHistory || []), { date: now.toISOString() }]
          return { ...it, srs: newSrs, reviewHistory }
        })
        localStorage.setItem(key, JSON.stringify(data))
      }
    }
  } catch (e) {
    console.error('applyReview: error al persistir el repaso', e)
  }

  // Quitar de decayed_items (pendientes del test semanal).
  try {
    const decayed = getDecayedIds()
    if (decayed.has(itemId)) {
      decayed.delete(itemId)
      localStorage.setItem('decayed_items', JSON.stringify([...decayed]))
    }
  } catch {
    /* noop */
  }

  // Avisar a otras vistas abiertas (algunas escuchan 'storage') para que refresquen.
  try {
    window.dispatchEvent(new Event('storage'))
  } catch {
    /* noop */
  }

  return newSrs
}
