import { NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@/lib/supabaseRoute'
import { isValidUUID } from '@/lib/validate'
import { ApiResponse } from '@/shared/types/api'

export const runtime = 'nodejs'

// POST /api/chats/[id]/close { aprendizajeId? }
// - Marca el chat como cerrado y enlaza (opcional) el aprendizaje guardado
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseForRequest(request)
    const { id } = await params
    if (!isValidUUID(id)) return NextResponse.json<ApiResponse>({ success: false, error: 'INVALID_REQUEST', message: 'id inválido' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    // aprendizajeId is an optional link to a saved learning. Accept null or a
    // bounded id (uuid or short numeric string); reject objects/oversized blobs.
    const rawAprendizajeId = body?.aprendizajeId
    let aprendizajeId: string | number | null = null
    if (rawAprendizajeId !== undefined && rawAprendizajeId !== null) {
      if (typeof rawAprendizajeId === 'number' && Number.isInteger(rawAprendizajeId)) {
        aprendizajeId = rawAprendizajeId
      } else if (typeof rawAprendizajeId === 'string' && rawAprendizajeId.length > 0 && rawAprendizajeId.length <= 64) {
        aprendizajeId = rawAprendizajeId
      } else {
        return NextResponse.json<ApiResponse>({ success: false, error: 'INVALID_REQUEST', message: 'aprendizajeId inválido' }, { status: 400 })
      }
    }

    const { error } = await supabase
      .from('chats')
      .update({ estado: 'cerrado', closed_at: new Date().toISOString(), aprendizaje_id: aprendizajeId })
      .eq('id', id)
    
    if (error) throw new Error(error.message)

    return NextResponse.json<ApiResponse>({ success: true })
  } catch (e) {
    console.error('[chats/[id]/close] Error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json<ApiResponse>({ success: false, error: 'INTERNAL_ERROR', message: 'An internal error occurred' }, { status: 500 })
  }
}
