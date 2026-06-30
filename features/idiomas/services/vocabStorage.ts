/**
 * Almacenamiento y lógica de vocabulario en localStorage.
 *
 * Espejo del patrón de `sector_data_<id>`: los datos viven en
 * `vocab_data_<lang>` como `{ items: VocabWord[], updatedAt }` y se sincronizan
 * con Supabase (ver vocabSync.ts). ADITIVO y tolerante a fallos: si algo va mal,
 * conserva lo que hubiera y nunca rompe la app.
 *
 * Reutiliza el motor SRS puro de lib/srs.ts (initSrs/reviewSrs/isDue).
 */
import { initSrs, reviewSrs, isDue, type ReviewGrade } from '@/lib/srs'
import { triggerVocabSync, pushVocabDeletion } from './vocabSync'
import type {
  VocabWord,
  VocabLang,
  ReviewDirection,
  GeneratedCard,
  VocabSource,
} from '../types'

const DEFAULT_LANG: VocabLang = 'en'
const KEY = (lang: VocabLang) => `vocab_data_${lang}`

/** Intervalo (días) a partir del cual una palabra se considera "dominada". */
export const MASTERED_INTERVAL_DAYS = 21
/** Umbral de lapsos por defecto para marcar una palabra como leech. */
export const DEFAULT_LEECH_THRESHOLD = 8

// --------------------------------------------------------------------------
// Lectura / escritura
// --------------------------------------------------------------------------

/** Lee TODAS las palabras crudas, incluidas las marcadas como borradas (tombstones). */
function readRaw(lang: VocabLang = DEFAULT_LANG): VocabWord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY(lang))
    if (!raw) return []
    const d = JSON.parse(raw)
    const items: VocabWord[] = Array.isArray(d?.items) ? d.items : []
    return items.filter((it) => it && it.id)
  } catch {
    return []
  }
}

/** Lee las palabras visibles (no borradas) de un idioma. */
export function readVocab(lang: VocabLang = DEFAULT_LANG): VocabWord[] {
  return readRaw(lang).filter((it) => !it.deletedAt)
}

/** Sobrescribe la lista completa de palabras de un idioma (incluye tombstones). */
export function writeVocab(items: VocabWord[], lang: VocabLang = DEFAULT_LANG): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY(lang), JSON.stringify({ items, updatedAt: new Date().toISOString() }))
  } catch (e) {
    console.error('[vocabStorage] no se pudo escribir', lang, e)
  }
}

function id(): string {
  // crypto.randomUUID está disponible en navegadores modernos; fallback simple.
  try {
    return crypto.randomUUID()
  } catch {
    return `v_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e9).toString(36)}`
  }
}

// --------------------------------------------------------------------------
// CRUD
// --------------------------------------------------------------------------

/** Crea una palabra nueva (due HOY) a partir de una tarjeta generada/editada. */
export function addWord(
  card: GeneratedCard & { notes?: string },
  opts: { lang?: VocabLang; source?: VocabSource } = {},
): VocabWord {
  const lang = opts.lang ?? DEFAULT_LANG
  const now = new Date()
  const nowIso = now.toISOString()
  const word: VocabWord = {
    id: id(),
    lang,
    word: card.word.trim(),
    translation: card.translation.trim(),
    partOfSpeech: card.partOfSpeech ?? 'other',
    phonetic: card.phonetic?.trim() || undefined,
    example: (card.example ?? '').trim(),
    exampleTranslation: card.exampleTranslation?.trim() || undefined,
    cefr: card.cefr,
    synonyms: Array.isArray(card.synonyms) ? card.synonyms.slice(0, 8) : undefined,
    notes: card.notes?.trim() || undefined,
    status: 'new',
    source: opts.source ?? 'manual',
    srs: initSrs(now),
    lapses: 0,
    reviewHistory: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    deletedAt: null,
  }
  const items = readRaw(lang)
  // Evita duplicar exactamente la misma palabra+tipo (case-insensitive), ignorando
  // tombstones; así "book" (noun) y "book" (verb) pueden coexistir.
  const dupe = items.find(
    (it) => !it.deletedAt && it.word.toLowerCase() === word.word.toLowerCase() && it.partOfSpeech === word.partOfSpeech,
  )
  if (dupe) return dupe
  writeVocab([word, ...items], lang)
  triggerVocabSync()
  return word
}

/** Actualiza campos de una palabra existente. */
export function updateWord(
  wordId: string,
  patch: Partial<VocabWord>,
  lang: VocabLang = DEFAULT_LANG,
): VocabWord | null {
  const items = readRaw(lang)
  let updated: VocabWord | null = null
  const next = items.map((it) => {
    if (it.id !== wordId) return it
    updated = { ...it, ...patch, id: it.id, updatedAt: new Date().toISOString() }
    return updated
  })
  if (updated) {
    writeVocab(next, lang)
    triggerVocabSync()
  }
  return updated
}

/**
 * Borra una palabra de forma DURABLE: deja un tombstone local (deletedAt) para
 * que un borrado offline no se "resucite" en el próximo merge, y propaga el
 * borrado al remoto. readVocab() ya oculta los tombstones.
 */
export function deleteWord(wordId: string, lang: VocabLang = DEFAULT_LANG): void {
  const nowIso = new Date().toISOString()
  const items = readRaw(lang)
  const next = items.map((it) => (it.id === wordId ? { ...it, deletedAt: nowIso, updatedAt: nowIso } : it))
  writeVocab(next, lang)
  void pushVocabDeletion(wordId)
  triggerVocabSync()
}

// --------------------------------------------------------------------------
// Selección de la cola diaria
// --------------------------------------------------------------------------

/**
 * Devuelve la cola de práctica de hoy:
 *   [repasos vencidos (ya practicados, SRS due, no leech) ...] +
 *   [hasta `dailyGoal` palabras NUEVAS (nunca practicadas) ...]
 *
 * Importante: una palabra nueva tiene dueDate=ahora, pero NO cuenta como
 * "repaso vencido" (su lastReviewed es null); solo entra por el cupo de nuevas,
 * así se respeta la cadencia de ~3/día.
 */
export function getTodayQueue(
  now: Date,
  dailyGoal: number,
  lang: VocabLang = DEFAULT_LANG,
): VocabWord[] {
  const items = readVocab(lang)
  const reviewsDue = items.filter(
    (it) => it.status !== 'leech' && it.srs.lastReviewed !== null && isDue(it.srs, now),
  )
  const fresh = items
    .filter((it) => it.status === 'new')
    .sort((a, b) => {
      // manual/telegram antes que ai; luego por fecha de creación (más nuevas antes).
      const score = (s: VocabSource) => (s === 'ai' ? 1 : 0)
      const d = score(a.source) - score(b.source)
      if (d !== 0) return d
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    .slice(0, Math.max(0, dailyGoal))

  return [...reviewsDue, ...fresh]
}

/** Palabras "atascadas" (leech). */
export function getLeeches(lang: VocabLang = DEFAULT_LANG): VocabWord[] {
  return readVocab(lang).filter((it) => it.status === 'leech')
}

// --------------------------------------------------------------------------
// Grading (repaso)
// --------------------------------------------------------------------------

/** Dirección recomendada para el próximo repaso según el progreso SRS. */
export function nextDirection(word: VocabWord): ReviewDirection {
  return word.srs.reps < 2 ? 'recv' : 'prod'
}

/**
 * Calcula el nuevo estado de una palabra tras un repaso (puro, sin persistir).
 * Centraliza la lógica para que la app y el agente de Telegram la compartan.
 *
 * Orden de prioridad del estado: leech > known > learning. Así una palabra
 * "dominada" que se vuelve a fallar repetidamente PUEDE pasar a "atascada"
 * (antes quedaba atrapada en "known" para siempre).
 */
export function computeReviewedState(
  prev: { srs: VocabWord['srs']; lapses: number; status: VocabWord['status']; learnedAt?: string; masteredAt?: string },
  grade: ReviewGrade,
  now: Date,
  leechThreshold: number = DEFAULT_LEECH_THRESHOLD,
): { srs: VocabWord['srs']; lapses: number; status: VocabWord['status']; learnedAt?: string; masteredAt?: string } {
  const srs = reviewSrs(prev.srs, grade, now)
  const nowIso = now.toISOString()
  const lapses = grade === 'again' ? prev.lapses + 1 : prev.lapses
  let learnedAt = prev.learnedAt
  let masteredAt = prev.masteredAt

  if (grade !== 'again' && !learnedAt) learnedAt = nowIso
  if (srs.intervalDays >= MASTERED_INTERVAL_DAYS && !masteredAt) masteredAt = nowIso

  let status: VocabWord['status']
  if (lapses >= leechThreshold) status = 'leech'
  else if (masteredAt) status = 'known'
  else status = 'learning'

  return { srs, lapses, status, learnedAt, masteredAt }
}

/**
 * Aplica un repaso a una palabra: actualiza SRS, lapsos, estado, hitos e
 * historial. Persiste y dispara sync. Devuelve la palabra actualizada.
 */
export function applyVocabReview(
  wordId: string,
  grade: ReviewGrade,
  dir: ReviewDirection,
  now: Date,
  leechThreshold: number = DEFAULT_LEECH_THRESHOLD,
  lang: VocabLang = DEFAULT_LANG,
): VocabWord | null {
  const items = readRaw(lang)
  let updated: VocabWord | null = null

  const next = items.map((it) => {
    if (it.id !== wordId) return it
    const r = computeReviewedState(
      { srs: it.srs, lapses: it.lapses, status: it.status, learnedAt: it.learnedAt, masteredAt: it.masteredAt },
      grade,
      now,
      leechThreshold,
    )
    const reviewHistory = [...it.reviewHistory, { date: now.toISOString(), grade, dir }]
    updated = { ...it, ...r, reviewHistory, updatedAt: now.toISOString() }
    return updated
  })

  if (updated) {
    writeVocab(next, lang)
    triggerVocabSync()
  }
  return updated
}

/**
 * Rehabilita una leech tras una pista/acierto: baja los lapsos y la devuelve a
 * la rotación normal con due inmediato.
 */
export function rescueLeech(wordId: string, now: Date, lang: VocabLang = DEFAULT_LANG): VocabWord | null {
  return updateWord(
    wordId,
    {
      status: 'learning',
      lapses: 0,
      srs: { ...initSrs(now) },
    },
    lang,
  )
}
