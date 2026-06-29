/**
 * Sincronización de vocabulario entre dispositivos.
 *
 * IMPORTANTE: el vocabulario se ESPEJA en la tabla `learnings` ya existente en
 * producción (bajo un sector reservado `__vocab_en__`), NO en una tabla nueva.
 * Motivo: la app real corre en un proyecto Supabase al que no se le puede
 * aplicar DDL desde aquí; reutilizar `learnings` evita depender de crear una
 * tabla. El sector reservado es invisible para el resto de la app (no está en
 * SECTORES_DATA y learningsSync lo ignora explícitamente).
 *
 * Cada palabra se serializa: word→title, translation→summary, y el resto de
 * campos en `content` como JSON. Sube todo lo local + baja la verdad remota
 * (last-write-wins por updatedAt) con un MERGE por id que nunca pierde datos.
 */
import { initSrs, type SrsState } from '@/lib/srs'
import type { VocabWord, VocabLang } from '../types'

const DEFAULT_LANG: VocabLang = 'en'
const KEY = (lang: VocabLang) => `vocab_data_${lang}`

/** Fila de la tabla `learnings` (subconjunto que usamos). */
interface LearningRow {
  id: string
  sector_id: string
  title?: string | null
  summary?: string | null
  content?: string | null
  tags?: string[] | null
  is_favorite?: boolean | null
  personal_note?: string | null
  srs?: unknown
  review_history?: unknown
  item_date?: string | null
  updated_at?: string
  deleted_at?: string | null
}

function readAll(lang: VocabLang): VocabWord[] {
  try {
    const raw = localStorage.getItem(KEY(lang))
    if (!raw) return []
    const d = JSON.parse(raw)
    return Array.isArray(d?.items) ? d.items : []
  } catch {
    return []
  }
}

function writeAll(items: VocabWord[], lang: VocabLang) {
  try {
    localStorage.setItem(KEY(lang), JSON.stringify({ items, updatedAt: new Date().toISOString() }))
  } catch (e) {
    console.error('[vocabSync] no se pudo escribir', lang, e)
  }
}

function ts(v?: string | null): number {
  if (!v) return 0
  const t = new Date(v).getTime()
  return isNaN(t) ? 0 : t
}

/** Sector reservado para el vocabulario dentro de la tabla `learnings`. */
function reservedSector(lang: VocabLang): string {
  return `__vocab_${lang}__`
}

/** VocabWord -> fila de `learnings`. */
function localToRemote(it: VocabWord): LearningRow {
  const extra = {
    partOfSpeech: it.partOfSpeech,
    phonetic: it.phonetic ?? null,
    example: it.example ?? '',
    exampleTranslation: it.exampleTranslation ?? null,
    cefr: it.cefr ?? null,
    synonyms: it.synonyms ?? [],
    notes: it.notes ?? null,
    lang: it.lang,
    status: it.status,
    source: it.source,
    lapses: it.lapses ?? 0,
    learnedAt: it.learnedAt ?? null,
    masteredAt: it.masteredAt ?? null,
    createdAt: it.createdAt,
  }
  return {
    id: it.id,
    sector_id: reservedSector(it.lang),
    title: it.word,
    summary: it.translation,
    content: JSON.stringify(extra),
    tags: [it.cefr ?? '', it.partOfSpeech].filter(Boolean),
    is_favorite: false,
    personal_note: it.phonetic ?? null,
    srs: it.srs ?? null,
    review_history: it.reviewHistory ?? [],
    item_date: it.createdAt ?? null,
    updated_at: it.updatedAt ?? it.createdAt ?? new Date(0).toISOString(),
    deleted_at: it.deletedAt ?? null,
  }
}

/** Fila de `learnings` -> VocabWord. */
function remoteToLocal(r: LearningRow): VocabWord {
  let extra: Record<string, unknown> = {}
  try {
    extra = r.content ? JSON.parse(r.content) : {}
  } catch {
    extra = {}
  }
  const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined)
  return {
    id: r.id,
    lang: (str(extra.lang) as VocabLang) || 'en',
    word: r.title ?? '',
    translation: r.summary ?? '',
    partOfSpeech: (str(extra.partOfSpeech) as VocabWord['partOfSpeech']) || 'other',
    phonetic: str(extra.phonetic) ?? r.personal_note ?? undefined,
    example: str(extra.example) ?? '',
    exampleTranslation: str(extra.exampleTranslation),
    cefr: (str(extra.cefr) as VocabWord['cefr']) ?? undefined,
    synonyms: Array.isArray(extra.synonyms) ? (extra.synonyms as string[]) : undefined,
    notes: str(extra.notes),
    status: (str(extra.status) as VocabWord['status']) || 'new',
    source: (str(extra.source) as VocabWord['source']) || 'manual',
    srs: (r.srs as SrsState) ?? initSrs(new Date()),
    lapses: typeof extra.lapses === 'number' ? (extra.lapses as number) : 0,
    reviewHistory: Array.isArray(r.review_history) ? (r.review_history as VocabWord['reviewHistory']) : [],
    learnedAt: str(extra.learnedAt),
    masteredAt: str(extra.masteredAt),
    createdAt: str(extra.createdAt) ?? r.item_date ?? r.updated_at ?? new Date().toISOString(),
    updatedAt: r.updated_at ?? new Date().toISOString(),
    deletedAt: r.deleted_at ?? null,
  }
}

let inFlight: Promise<{ ok: boolean; pulled?: number }> | null = null

/** Sube el vocabulario local y reconstruye con la verdad remota. Coalesce. */
export async function syncVocab(lang: VocabLang = DEFAULT_LANG): Promise<{ ok: boolean; pulled?: number }> {
  if (typeof window === 'undefined') return { ok: false }
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const payload = readAll(lang)
        .filter((it) => it?.id)
        .map(localToRemote)

      const res = await fetch('/api/idiomas/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      })
      if (!res.ok) return { ok: false }
      const data = await res.json()
      const remote: LearningRow[] = Array.isArray(data?.items) ? data.items : []

      // MERGE por id con last-write-wins. Relee local fresco (evita carreras).
      const local = readAll(lang)
      const byId = new Map<string, VocabWord>()
      for (const it of local) if (it?.id) byId.set(it.id, it)

      for (const r of remote) {
        if (!r?.id) continue
        const existing = byId.get(r.id)
        if (r.deleted_at) {
          const localUpd = ts(existing?.updatedAt)
          if (!existing || localUpd <= ts(r.deleted_at)) byId.delete(r.id)
          continue
        }
        const localUpd = ts(existing?.updatedAt)
        if (!existing || ts(r.updated_at) >= localUpd) byId.set(r.id, remoteToLocal(r))
      }

      writeAll(Array.from(byId.values()), lang)
      try {
        window.dispatchEvent(new Event('vocab-synced'))
      } catch {
        /* noop */
      }
      return { ok: true, pulled: remote.filter((r) => !r.deleted_at).length }
    } catch (e) {
      console.error('[vocabSync] error', e)
      return { ok: false }
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

let syncTimer: ReturnType<typeof setTimeout> | null = null
/** Lanza un sync con debounce tras una mutación. */
export function triggerVocabSync(delayMs = 1500) {
  if (typeof window === 'undefined') return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    void syncVocab()
  }, delayMs)
}

/** Marca una palabra como borrada en remoto (tombstone). */
export async function pushVocabDeletion(wordId: string): Promise<void> {
  if (typeof window === 'undefined' || !wordId) return
  try {
    await fetch(`/api/idiomas/${encodeURIComponent(wordId)}`, { method: 'DELETE' })
  } catch (e) {
    console.error('[pushVocabDeletion] error', e)
  }
}
