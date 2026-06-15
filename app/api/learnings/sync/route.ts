import { NextResponse } from 'next/server'
import { getSupabaseAnon } from '@/lib/supabaseAnonClient'

export const runtime = 'nodejs'

// Espejo de un aprendizaje para sincronizar (forma de la tabla `learnings`).
interface IncomingLearning {
  id: string
  sector_id: string
  title?: string | null
  summary?: string | null
  content?: string | null
  tags?: string[]
  is_favorite?: boolean
  personal_note?: string | null
  srs?: unknown
  review_history?: unknown
  item_date?: string | null
  updated_at?: string
  deleted_at?: string | null
}

// POST /api/learnings/sync
// Body: { items: IncomingLearning[] } — todos los aprendizajes locales del cliente.
// 1) Upsert de los que son NUEVOS o más recientes que lo remoto (last-write-wins).
// 2) Devuelve TODA la verdad remota para que el cliente reconstruya su estado.
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAnon()
    const body = await request.json().catch(() => ({}))
    const rawItems: unknown = (body as { items?: unknown })?.items
    const items: IncomingLearning[] = Array.isArray(rawItems) ? (rawItems as IncomingLearning[]) : []

    if (items.length > 5000) {
      return NextResponse.json({ success: false, error: 'TOO_MANY' }, { status: 400 })
    }

    // Normalizar + acotar tamaños (defensa básica)
    const incoming = items
      .filter((it) => it && typeof it.id === 'string' && it.id && typeof it.sector_id === 'string' && it.sector_id)
      .map((it) => ({
        id: String(it.id).slice(0, 200),
        sector_id: String(it.sector_id).slice(0, 64),
        title: it.title != null ? String(it.title).slice(0, 500) : null,
        summary: it.summary != null ? String(it.summary).slice(0, 20000) : null,
        content: it.content != null ? String(it.content).slice(0, 200000) : null,
        tags: Array.isArray(it.tags) ? it.tags.slice(0, 50).map((t) => String(t).slice(0, 100)) : [],
        is_favorite: !!it.is_favorite,
        personal_note: it.personal_note != null ? String(it.personal_note).slice(0, 5000) : null,
        srs: it.srs ?? null,
        review_history: Array.isArray(it.review_history) ? it.review_history.slice(0, 2000) : [],
        item_date: it.item_date || null,
        updated_at: it.updated_at || new Date().toISOString(),
        deleted_at: it.deleted_at || null,
      }))

    // Last-write-wins: comparar con lo remoto y subir solo lo nuevo/más reciente.
    let toUpsert = incoming
    if (incoming.length) {
      const ids = incoming.map((i) => i.id)
      const { data: existing } = await supabase.from('learnings').select('id,updated_at').in('id', ids)
      const exMap = new Map((existing || []).map((r: { id: string; updated_at: string }) => [r.id, r.updated_at]))
      toUpsert = incoming.filter((it) => {
        const ex = exMap.get(it.id)
        return !ex || new Date(it.updated_at).getTime() > new Date(ex as string).getTime()
      })
    }

    if (toUpsert.length) {
      const { error } = await supabase.from('learnings').upsert(toUpsert, { onConflict: 'id' })
      if (error) {
        console.error('[learnings/sync] upsert error:', error.message)
        return NextResponse.json({ success: false, error: 'DB_ERROR' }, { status: 500 })
      }
    }

    // Verdad remota completa (el cliente filtra los deleted_at).
    const { data: all, error: selErr } = await supabase.from('learnings').select('*').limit(10000)
    if (selErr) {
      console.error('[learnings/sync] select error:', selErr.message)
      return NextResponse.json({ success: false, error: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ success: true, items: all || [], upserted: toUpsert.length })
  } catch (e) {
    console.error('[learnings/sync] error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
