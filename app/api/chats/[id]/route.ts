import { NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@/lib/supabaseRoute'
import { ApiResponse } from '@/shared/types/api'

export const runtime = 'nodejs'

interface ChatDetailsResponse extends ApiResponse {
  chat?: any;
  mensajes?: any[];
}

// GET /api/chats/[id] -> { chat, mensajes }
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseForRequest(request)
    const id = params?.id
    if (!id) return NextResponse.json<ChatDetailsResponse>({ success: false, error: 'INVALID_REQUEST', message: 'Falta id' }, { status: 400 })

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

    return NextResponse.json<ChatDetailsResponse>({ success: true, chat, mensajes })
  } catch (e: any) {
    return NextResponse.json<ChatDetailsResponse>({ success: false, error: 'INTERNAL_ERROR', message: e?.message || 'Error' }, { status: 500 })
  }
}
