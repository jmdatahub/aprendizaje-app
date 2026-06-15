import { NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@/lib/supabaseRoute'
import { ApiResponse } from '@/shared/types/api'
import { isValidUUID, badRequest } from '@/lib/validate'

export const runtime = 'nodejs'

interface ChatRow {
  id: string;
  tema: string | null;
  sector_id: number | null;
  estado: string;
  created_at: string;
  closed_at: string | null;
  aprendizaje_id: string | null;
}

interface ChatMensajeRow {
  id: string;
  rol: string;
  texto: string;
  created_at: string;
}

interface ChatDetailsResponse extends ApiResponse {
  chat?: ChatRow;
  mensajes?: ChatMensajeRow[];
}

// GET /api/chats/[id] -> { chat, mensajes }
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseForRequest(request)
    const { id } = await params
    if (!isValidUUID(id)) return badRequest('id inválido')

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
      .limit(2000)
    if (e2) throw new Error(e2.message)

    return NextResponse.json<ChatDetailsResponse>({ success: true, chat, mensajes })
  } catch (e) {
    console.error('[chats/[id] GET] Error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json<ChatDetailsResponse>({ success: false, error: 'INTERNAL_ERROR', message: 'An internal error occurred' }, { status: 500 })
  }
}
