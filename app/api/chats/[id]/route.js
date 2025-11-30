import { NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@/lib/supabaseRoute'

export const runtime = 'nodejs'

// GET /api/chats/[id] -> { chat, mensajes }
export async function GET(request, { params }) {
  try {
    const supabase = getSupabaseForRequest(request)
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

    const { data: chat, error: e1 } = await supabase
      .from('chats')
      .select('id,tema,sector_id,estado,created_at,closed_at,aprendizaje_id')
      .eq('id', id)
      .single()
    if (e1) throw new Error(e1.message)

    const { data: mensajes, error: e2 } = await supabase
      .from('chat_mensajes')
      .select('id,rol,texto,created_at')
      .eq('chat_id', id)
      .order('created_at', { ascending: true })
    if (e2) throw new Error(e2.message)

    return NextResponse.json({ chat, mensajes })
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 })
  }
}
