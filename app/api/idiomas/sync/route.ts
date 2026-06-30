/**
 * POST /api/idiomas/sync
 * Body: { items: LearningRow[] } — el vocabulario local serializado como filas
 * de la tabla `learnings` (sector reservado `__vocab_<lang>__`).
 *
 * El vocabulario se espeja en la tabla `learnings` EXISTENTE (no en una tabla
 * nueva) para no depender de aplicar DDL en el proyecto Supabase de producción.
 * El sector reservado es invisible para el resto de la app.
 * 1) Upsert de lo nuevo o más reciente (last-write-wins por updated_at).
 * 2) Devuelve solo las filas del vocabulario para que el cliente reconstruya.
 */
import { NextResponse } from 'next/server'
import { getSupabaseAnon } from '@/lib/supabaseAnonClient'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export const runtime = 'nodejs'

/** Cap de items por sync (vocabulario es pequeño; evita IN() gigantes). */
const MAX_ITEMS = 2000

/** Solo aceptamos sectores reservados de vocabulario (defensa). */
const RESERVED_RE = /^__vocab_[a-z]{2}__$/

interface IncomingRow {
  id: string
  sector_id?: string | null
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

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const { success: allowed } = await rateLimit(`idiomas-sync:${ip}`, 60, 60)
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'RATE_LIMITED' }, { status: 429 })
    }

    const supabase = getSupabaseAnon()
    const body = await request.json().catch(() => ({}))
    const rawItems: unknown = (body as { items?: unknown })?.items
    const items: IncomingRow[] = Array.isArray(rawItems) ? (rawItems as IncomingRow[]) : []

    if (items.length > MAX_ITEMS) {
      return NextResponse.json({ success: false, error: 'TOO_MANY' }, { status: 400 })
    }

    const str = (v: unknown, max: number) => (v != null ? String(v).slice(0, max) : null)
    const incoming = items
      .filter((it) => it && typeof it.id === 'string' && it.id && RESERVED_RE.test(String(it.sector_id || '')))
      .map((it) => ({
        id: String(it.id).slice(0, 200),
        sector_id: String(it.sector_id).slice(0, 32),
        title: str(it.title, 200),
        summary: str(it.summary, 400),
        content: str(it.content, 8000),
        tags: Array.isArray(it.tags) ? it.tags.slice(0, 10).map((t) => String(t).slice(0, 80)) : [],
        is_favorite: !!it.is_favorite,
        personal_note: str(it.personal_note, 200),
        srs: it.srs ?? null,
        review_history: Array.isArray(it.review_history) ? it.review_history.slice(0, 5000) : [],
        item_date: it.item_date || null,
        updated_at: it.updated_at || new Date().toISOString(),
        deleted_at: it.deleted_at || null,
      }))

    // Last-write-wins: subir solo lo nuevo/más reciente.
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
        console.error('[idiomas/sync] upsert error:', error.message)
        return NextResponse.json({ success: false, error: 'DB_ERROR' }, { status: 500 })
      }
    }

    // Devuelve solo las filas de vocabulario (sector reservado, sin comodines).
    const { data: all, error: selErr } = await supabase
      .from('learnings')
      .select('*')
      .eq('sector_id', '__vocab_en__')
      .limit(20000)
    if (selErr) {
      console.error('[idiomas/sync] select error:', selErr.message)
      return NextResponse.json({ success: false, error: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ success: true, items: all || [], upserted: toUpsert.length })
  } catch (e) {
    console.error('[idiomas/sync] error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
