import { NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@/lib/supabaseRoute'

export const runtime = 'nodejs'

// POST /api/chats/[id]/close { aprendizajeId? }
// - Marca el chat como cerrado y enlaza (opcional) el aprendizaje guardado
export async function POST(request, { params }) {
  try {
    const supabase = getSupabaseForRequest(request)
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    const aprendizajeId = body?.aprendizajeId ?? null

    const { error } = await supabase
      .from('chats')
      .update({ estado: 'cerrado', closed_at: new Date().toISOString(), aprendizaje_id: aprendizajeId })
      .eq('id', id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 })
  }
}
