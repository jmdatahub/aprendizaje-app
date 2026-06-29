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

/** Lee todas las palabras NO borradas de un idioma. */
export function readVocab(lang: VocabLang = DEFAULT_LANG): VocabWord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY(lang))
    if (!raw) return []
    const d = JSON.parse(raw)
    const items: VocabWord[] = Array.isArray(d?.items) ? d.items : []
    return items.filter((it) => it && it.id && !it.deletedAt)
  } catch {
    return []
  }
}

/** Sobrescribe la lista completa de palabras de un idioma. */
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
  const items = readVocab(lang)
  // Evita duplicar exactamente la misma palabra (case-insensitive).
  const dupe = items.find((it) => it.word.toLowerCase() === word.word.toLowerCase())
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
  const items = readVocab(lang)
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

/** Borra (tombstone) una palabra y propaga el borrado al sync. */
export function deleteWord(wordId: string, lang: VocabLang = DEFAULT_LANG): void {
  const items = readVocab(lang)
  writeVocab(
    items.filter((it) => it.id !== wordId),
    lang,
  )
  void pushVocabDeletion(wordId)
  triggerVocabSync()
}

// --------------------------------------------------------------------------
// Selección de la cola diaria
// --------------------------------------------------------------------------

/**
 * Devuelve la cola de práctica de hoy:
 *   [vencidas (SRS due, no leech) ...] + [hasta `dailyGoal` palabras nuevas ...]
 * Las nuevas priorizan las que NO vienen de generación masiva de IA.
 */
export function getTodayQueue(
  now: Date,
  dailyGoal: number,
  lang: VocabLang = DEFAULT_LANG,
): VocabWord[] {
  const items = readVocab(lang)
  const due = items.filter((it) => it.status !== 'leech' && isDue(it.srs, now))
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

  // Quita de "fresh" las que ya estuvieran en "due" (una palabra nueva due no se duplica).
  const dueIds = new Set(due.map((d) => d.id))
  return [...due, ...fresh.filter((f) => !dueIds.has(f.id))]
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
 * Aplica un repaso a una palabra: actualiza SRS, lapsos, estado, hitos
 * (learnedAt/masteredAt) e historial. Persiste y dispara sync. Devuelve la
 * palabra actualizada (o null si no existe).
 *
 * `leechThreshold`: nº de lapsos a partir del cual la palabra pasa a "atascada".
 */
export function applyVocabReview(
  wordId: string,
  grade: ReviewGrade,
  dir: ReviewDirection,
  now: Date,
  leechThreshold: number = DEFAULT_LEECH_THRESHOLD,
  lang: VocabLang = DEFAULT_LANG,
): VocabWord | null {
  const items = readVocab(lang)
  let updated: VocabWord | null = null

  const next = items.map((it) => {
    if (it.id !== wordId) return it
    const srs = reviewSrs(it.srs, grade, now)
    const nowIso = now.toISOString()
    const lapses = grade === 'again' ? it.lapses + 1 : it.lapses
    const reviewHistory = [...it.reviewHistory, { date: nowIso, grade, dir }]

    let status = it.status
    let learnedAt = it.learnedAt
    let masteredAt = it.masteredAt

    // Primer acierto → cuenta como "aprendida" (meta semanal).
    if (grade !== 'again' && !learnedAt) learnedAt = nowIso
    // Intervalo largo → dominada.
    if (srs.intervalDays >= MASTERED_INTERVAL_DAYS && !masteredAt) {
      masteredAt = nowIso
      status = 'known'
    } else if (lapses >= leechThreshold) {
      status = 'leech'
    } else if (status !== 'known') {
      status = 'learning'
    }

    updated = { ...it, srs, lapses, reviewHistory, status, learnedAt, masteredAt, updatedAt: nowIso }
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
