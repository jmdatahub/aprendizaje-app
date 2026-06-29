/**
 * POST /api/idiomas/sync
 * Body: { items: RemoteVocab[] } — todo el vocabulario local del cliente.
 * 1) Upsert de lo nuevo o más reciente (last-write-wins por updated_at).
 * 2) Devuelve TODA la verdad remota para que el cliente reconstruya su estado.
 *
 * Espejo de /api/learnings/sync para la tabla `vocabulary`.
 */
import { NextResponse } from 'next/server'
import { getSupabaseAnon } from '@/lib/supabaseAnonClient'

export const runtime = 'nodejs'

interface IncomingVocab {
  id: string
  lang?: string | null
  word?: string | null
  translation?: string | null
  part_of_speech?: string | null
  phonetic?: string | null
  example?: string | null
  example_translation?: string | null
  cefr?: string | null
  synonyms?: string[]
  notes?: string | null
  status?: string | null
  source?: string | null
  srs?: unknown
  lapses?: number | null
  review_history?: unknown
  learned_at?: string | null
  mastered_at?: string | null
  created_at?: string | null
  updated_at?: string
  deleted_at?: string | null
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAnon()
    const body = await request.json().catch(() => ({}))
    const rawItems: unknown = (body as { items?: unknown })?.items
    const items: IncomingVocab[] = Array.isArray(rawItems) ? (rawItems as IncomingVocab[]) : []

    if (items.length > 10000) {
      return NextResponse.json({ success: false, error: 'TOO_MANY' }, { status: 400 })
    }

    const str = (v: unknown, max: number) => (v != null ? String(v).slice(0, max) : null)
    const incoming = items
      .filter((it) => it && typeof it.id === 'string' && it.id)
      .map((it) => ({
        id: String(it.id).slice(0, 200),
        lang: str(it.lang, 8) || 'en',
        word: str(it.word, 120),
        translation: str(it.translation, 400),
        part_of_speech: str(it.part_of_speech, 32),
        phonetic: str(it.phonetic, 120),
        example: str(it.example, 600),
        example_translation: str(it.example_translation, 600),
        cefr: str(it.cefr, 4),
        synonyms: Array.isArray(it.synonyms) ? it.synonyms.slice(0, 10).map((s) => String(s).slice(0, 80)) : [],
        notes: str(it.notes, 2000),
        status: str(it.status, 16) || 'new',
        source: str(it.source, 16) || 'manual',
        srs: it.srs ?? null,
        lapses: typeof it.lapses === 'number' ? it.lapses : 0,
        review_history: Array.isArray(it.review_history) ? it.review_history.slice(0, 5000) : [],
        learned_at: it.learned_at || null,
        mastered_at: it.mastered_at || null,
        created_at: it.created_at || null,
        updated_at: it.updated_at || new Date().toISOString(),
        deleted_at: it.deleted_at || null,
      }))

    // Last-write-wins: subir solo lo nuevo/más reciente.
    let toUpsert = incoming
    if (incoming.length) {
      const ids = incoming.map((i) => i.id)
      const { data: existing } = await supabase.from('vocabulary').select('id,updated_at').in('id', ids)
      const exMap = new Map((existing || []).map((r: { id: string; updated_at: string }) => [r.id, r.updated_at]))
      toUpsert = incoming.filter((it) => {
        const ex = exMap.get(it.id)
        return !ex || new Date(it.updated_at).getTime() > new Date(ex as string).getTime()
      })
    }

    if (toUpsert.length) {
      const { error } = await supabase.from('vocabulary').upsert(toUpsert, { onConflict: 'id' })
      if (error) {
        console.error('[idiomas/sync] upsert error:', error.message)
        return NextResponse.json({ success: false, error: 'DB_ERROR' }, { status: 500 })
      }
    }

    const { data: all, error: selErr } = await supabase.from('vocabulary').select('*').limit(20000)
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
