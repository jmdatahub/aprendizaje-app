/**
 * Sincronización de vocabulario entre dispositivos.
 *
 * Espejo de features/learning/services/learningsSync.ts pero para la tabla
 * `vocabulary`. Sube todo lo local + baja la verdad remota (last-write-wins por
 * `updatedAt`) y reconstruye el estado local con un MERGE por id que nunca pierde
 * datos. Tolerante a fallos: si Supabase no responde, la app sigue con
 * localStorage.
 */
import { initSrs, type SrsState } from '@/lib/srs'
import type { VocabWord, VocabLang } from '../types'

const DEFAULT_LANG: VocabLang = 'en'
const KEY = (lang: VocabLang) => `vocab_data_${lang}`

interface RemoteVocab {
  id: string
  lang?: string | null
  word?: string | null
  translation?: string | null
  part_of_speech?: string | null
  phonetic?: string | null
  example?: string | null
  example_translation?: string | null
  cefr?: string | null
  synonyms?: string[] | null
  notes?: string | null
  status?: string | null
  source?: string | null
  srs?: unknown
  lapses?: number | null
  review_history?: unknown
  learned_at?: string | null
  mastered_at?: string | null
  created_at?: string | null
  updated_at?: string | null
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

function localToRemote(it: VocabWord): RemoteVocab {
  return {
    id: it.id,
    lang: it.lang,
    word: it.word,
    translation: it.translation,
    part_of_speech: it.partOfSpeech,
    phonetic: it.phonetic ?? null,
    example: it.example ?? null,
    example_translation: it.exampleTranslation ?? null,
    cefr: it.cefr ?? null,
    synonyms: it.synonyms ?? [],
    notes: it.notes ?? null,
    status: it.status,
    source: it.source,
    srs: it.srs ?? null,
    lapses: it.lapses ?? 0,
    review_history: it.reviewHistory ?? [],
    learned_at: it.learnedAt ?? null,
    mastered_at: it.masteredAt ?? null,
    created_at: it.createdAt ?? null,
    updated_at: it.updatedAt ?? it.createdAt ?? new Date(0).toISOString(),
    deleted_at: it.deletedAt ?? null,
  }
}

function remoteToLocal(r: RemoteVocab): VocabWord {
  return {
    id: r.id,
    lang: (r.lang as VocabLang) || 'en',
    word: r.word ?? '',
    translation: r.translation ?? '',
    partOfSpeech: (r.part_of_speech as VocabWord['partOfSpeech']) || 'other',
    phonetic: r.phonetic ?? undefined,
    example: r.example ?? '',
    exampleTranslation: r.example_translation ?? undefined,
    cefr: (r.cefr as VocabWord['cefr']) ?? undefined,
    synonyms: Array.isArray(r.synonyms) ? r.synonyms : undefined,
    notes: r.notes ?? undefined,
    status: (r.status as VocabWord['status']) || 'new',
    source: (r.source as VocabWord['source']) || 'manual',
    srs: (r.srs as SrsState) ?? initSrs(new Date()),
    lapses: typeof r.lapses === 'number' ? r.lapses : 0,
    reviewHistory: Array.isArray(r.review_history) ? (r.review_history as VocabWord['reviewHistory']) : [],
    learnedAt: r.learned_at ?? undefined,
    masteredAt: r.mastered_at ?? undefined,
    createdAt: r.created_at ?? r.updated_at ?? new Date().toISOString(),
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
      const remote: RemoteVocab[] = Array.isArray(data?.items) ? data.items : []

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
