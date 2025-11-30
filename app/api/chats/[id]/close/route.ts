import { NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@/lib/supabaseRoute'
import { ApiResponse } from '@/shared/types/api'

export const runtime = 'nodejs'

// POST /api/chats/[id]/close { aprendizajeId? }
// - Marca el chat como cerrado y enlaza (opcional) el aprendizaje guardado
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseForRequest(request)
    const id = params?.id
    if (!id) return NextResponse.json<ApiResponse>({ success: false, error: 'INVALID_REQUEST', message: 'Falta id' }, { status: 400 })
    
    const body = await request.json().catch(() => ({}))
    const aprendizajeId = body?.aprendizajeId ?? null

    const { error } = await supabase
      .from('chats')
      .update({ estado: 'cerrado', closed_at: new Date().toISOString(), aprendizaje_id: aprendizajeId })
      .eq('id', id)
    
    if (error) throw new Error(error.message)

    return NextResponse.json<ApiResponse>({ success: true })
  } catch (e: any) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'INTERNAL_ERROR', message: e?.message || 'Error' }, { status: 500 })
  }
}
