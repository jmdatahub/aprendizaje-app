/**
 * Sincronización de aprendizajes entre dispositivos.
 *
 * Los aprendizajes viven en localStorage (`sector_data_<sectorId>`). Esta capa
 * los espeja en Supabase (tabla `learnings`) para que aparezcan en el móvil y en
 * el ordenador. Estrategia: subir todo lo local + bajar la verdad remota
 * (last-write-wins por `updatedAt`), y reconstruir el estado local con el merge.
 *
 * Es ADITIVO y tolerante a fallos: si Supabase no responde, la app sigue
 * funcionando con localStorage como hasta ahora.
 */
import { SECTORES_DATA } from '@/shared/constants/sectores'

export interface LocalLearning {
  id: string
  title?: string
  summary?: string
  content?: string
  date?: string
  tags?: string[]
  isFavorite?: boolean
  personalNote?: string
  srs?: unknown
  reviewHistory?: unknown
  updatedAt?: string
}

interface RemoteLearning {
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

const SECTOR_KEY = (id: string) => `sector_data_${id}`

function readSector(sectorId: string): LocalLearning[] {
  try {
    const raw = localStorage.getItem(SECTOR_KEY(sectorId))
    if (!raw) return []
    const d = JSON.parse(raw)
    return Array.isArray(d?.items) ? d.items : []
  } catch {
    return []
  }
}

function writeSector(sectorId: string, items: LocalLearning[]) {
  const key = SECTOR_KEY(sectorId)
  try {
    let existing: Record<string, unknown> = {}
    try {
      existing = JSON.parse(localStorage.getItem(key) || '{}') || {}
    } catch {
      existing = {}
    }
    localStorage.setItem(key, JSON.stringify({ ...existing, items }))
  } catch (e) {
    // QuotaExceededError u otro: no rompemos el sync, conservamos lo que había.
    console.error('[syncLearnings] no se pudo escribir el sector', sectorId, e)
  }
}

/** ms de una marca de tiempo (updatedAt/date); 0 si no es válida. */
function ts(v?: string | null): number {
  if (!v) return 0
  const t = new Date(v).getTime()
  return isNaN(t) ? 0 : t
}

function localToRemote(it: LocalLearning, sectorId: string) {
  return {
    id: it.id,
    sector_id: sectorId,
    title: it.title ?? null,
    summary: it.summary ?? null,
    content: it.content ?? null,
    tags: it.tags ?? [],
    is_favorite: it.isFavorite ?? false,
    personal_note: it.personalNote ?? null,
    srs: it.srs ?? null,
    review_history: it.reviewHistory ?? [],
    item_date: it.date ?? null,
    // Si el item no tiene updatedAt (legacy), usamos su fecha; así un item antiguo
    // no pisa una versión remota más nueva.
    updated_at: it.updatedAt ?? it.date ?? new Date(0).toISOString(),
    deleted_at: null,
  }
}

function remoteToLocal(r: RemoteLearning): LocalLearning {
  return {
    id: r.id,
    title: r.title ?? '',
    summary: r.summary ?? '',
    content: r.content ?? '',
    date: r.item_date ?? r.updated_at ?? new Date().toISOString(),
    tags: Array.isArray(r.tags) ? r.tags : [],
    isFavorite: !!r.is_favorite,
    personalNote: r.personal_note ?? '',
    srs: r.srs ?? undefined,
    reviewHistory: Array.isArray(r.review_history) ? r.review_history : [],
    updatedAt: r.updated_at,
  }
}

let inFlight: Promise<{ ok: boolean; pulled?: number }> | null = null

/**
 * Sube todos los aprendizajes locales y reconstruye el estado con la verdad
 * remota. Coalesce: si ya hay un sync en curso, reutiliza esa promesa.
 */
export async function syncLearnings(): Promise<{ ok: boolean; pulled?: number }> {
  if (typeof window === 'undefined') return { ok: false }
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const payload: ReturnType<typeof localToRemote>[] = []
      for (const s of SECTORES_DATA) {
        for (const it of readSector(s.id)) {
          if (it?.id) payload.push(localToRemote(it, s.id))
        }
      }

      const res = await fetch('/api/learnings/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      })
      if (!res.ok) return { ok: false }
      const data = await res.json()
      const remote: RemoteLearning[] = Array.isArray(data?.items) ? data.items : []

      // Agrupar lo remoto por sector (incluye tombstones para poder borrar).
      const remoteBySector = new Map<string, RemoteLearning[]>()
      for (const r of remote) {
        if (!r?.id || !r?.sector_id) continue
        const arr = remoteBySector.get(r.sector_id) || []
        arr.push(r)
        remoteBySector.set(r.sector_id, arr)
      }

      // MERGE (no reemplazo) por sector: unión por id con last-write-wins.
      // Relee local FRESCO (evita carreras con escrituras concurrentes) y NUNCA
      // descarta un item local que no esté en remoto (p.ej. recién creado y aún
      // sin subir, o más allá del límite del select). Así el sync no puede perder datos.
      const sectorIds = new Set<string>([...SECTORES_DATA.map((s) => s.id), ...remoteBySector.keys()])
      for (const sid of sectorIds) {
        const local = readSector(sid)
        const remoteRows = remoteBySector.get(sid) || []
        if (local.length === 0 && remoteRows.length === 0) continue

        const byId = new Map<string, LocalLearning>()
        for (const it of local) if (it?.id) byId.set(it.id, it)

        for (const r of remoteRows) {
          const existing = byId.get(r.id)
          if (r.deleted_at) {
            // Tombstone: borra en local salvo que local sea más nuevo que el borrado.
            const localUpd = ts(existing?.updatedAt ?? existing?.date)
            if (!existing || localUpd <= ts(r.deleted_at)) byId.delete(r.id)
            continue
          }
          // Vivo: gana el más reciente (si no hay local, entra el remoto).
          const localUpd = ts(existing?.updatedAt ?? existing?.date)
          if (!existing || ts(r.updated_at) >= localUpd) byId.set(r.id, remoteToLocal(r))
          // si local es más nuevo, se conserva y se subirá en el próximo sync
        }

        writeSector(sid, Array.from(byId.values()))
      }

      try {
        window.dispatchEvent(new Event('learnings-synced'))
      } catch {
        /* noop */
      }
      return { ok: true, pulled: remote.filter((r) => !r.deleted_at).length }
    } catch (e) {
      console.error('[syncLearnings] error', e)
      return { ok: false }
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

let syncTimer: ReturnType<typeof setTimeout> | null = null
/** Lanza un sync con debounce tras una mutación (crear/repasar/editar/borrar). */
export function triggerSync(delayMs = 1500) {
  if (typeof window === 'undefined') return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    void syncLearnings()
  }, delayMs)
}

/** Marca un aprendizaje como borrado en remoto para que el borrado se propague. */
export async function pushLearningDeletion(id: string): Promise<void> {
  if (typeof window === 'undefined' || !id) return
  try {
    await fetch(`/api/learnings/${encodeURIComponent(id)}`, { method: 'DELETE' })
  } catch (e) {
    console.error('[pushLearningDeletion] error', e)
  }
}
