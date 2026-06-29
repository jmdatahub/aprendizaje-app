/**
 * Tipos del módulo "Idiomas" (aprendizaje de vocabulario).
 *
 * El vocabulario vive en localStorage (`vocab_data_<lang>`) y se espeja en
 * Supabase (tabla `vocabulary`) para sincronizar entre móvil y ordenador, igual
 * que los aprendizajes. Reutiliza el motor SRS de `lib/srs.ts`.
 *
 * Ver docs/IDIOMAS_ARCHITECTURE.md para el diseño completo.
 */
import type { SrsState } from '@/lib/srs'

/** Idioma destino que se aprende. Extensible (de momento solo inglés). */
export type VocabLang = 'en'

/** Nivel CEFR estimado por la IA. A1–B1 = "demasiado básico" (se avisa). */
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

/** Categoría gramatical. */
export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'phrasal_verb'
  | 'idiom'
  | 'expression'
  | 'other'

/**
 * Estado de aprendizaje de una palabra:
 * - new:      nunca practicada.
 * - learning: en proceso (ya practicada, intervalo < 21 días).
 * - known:    dominada (intervalo SRS ≥ 21 días).
 * - leech:    se falla repetidamente; sale de la cola normal a "Atascadas".
 */
export type WordStatus = 'new' | 'learning' | 'known' | 'leech'

/** Dirección de un repaso: receptivo (EN→ES) o productivo (ES→EN). */
export type ReviewDirection = 'recv' | 'prod'

/** Fuente de alta de la palabra. */
export type VocabSource = 'manual' | 'ai' | 'telegram'

/** Una entrada del historial de repasos de una palabra. */
export interface VocabReviewEntry {
  date: string
  grade: 'again' | 'good' | 'easy'
  dir: ReviewDirection
}

/** Una palabra de vocabulario. */
export interface VocabWord {
  id: string
  lang: VocabLang

  word: string
  translation: string
  partOfSpeech: PartOfSpeech
  phonetic?: string
  example: string
  exampleTranslation?: string
  cefr?: CefrLevel
  synonyms?: string[]
  notes?: string

  status: WordStatus
  source: VocabSource

  srs: SrsState
  lapses: number
  reviewHistory: VocabReviewEntry[]

  learnedAt?: string
  masteredAt?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

/** Datos que devuelve la IA al generar una tarjeta (antes de revisar). */
export interface GeneratedCard {
  word: string
  translation: string
  partOfSpeech: PartOfSpeech
  phonetic?: string
  example: string
  exampleTranslation?: string
  cefr?: CefrLevel
  synonyms?: string[]
}

/** Métricas del tablero de idiomas. */
export interface VocabStats {
  total: number
  weekLearned: number
  weeklyGoal: number
  todayLearned: number
  dailyGoal: number
  dueToday: number
  newAvailable: number
  mastered: number
  leeches: number
  /** Fechas de práctica (para la racha unificada). */
  practiceDates: string[]
}
