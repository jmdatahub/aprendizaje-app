import { NextResponse } from 'next/server'
import { getSupabaseAnon } from '@/lib/supabaseAnonClient'

export const runtime = 'nodejs'

// DELETE /api/idiomas/[id] — marca la palabra como borrada (tombstone) en la
// tabla `learnings` (sector reservado de vocabulario) para que el borrado se
// propague al resto de dispositivos en el próximo sync.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseAnon()
    const { id } = await params
    if (!id || typeof id !== 'string' || id.length > 200) {
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST' }, { status: 400 })
    }
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('learnings')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', id)
      .eq('sector_id', '__vocab_en__')
    if (error) {
      console.error('[idiomas DELETE] error:', error.message)
      return NextResponse.json({ success: false, error: 'DB_ERROR' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[idiomas DELETE] error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
