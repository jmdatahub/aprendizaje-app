import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@/shared/types/api'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const { conversacion, titulo, resumen, sectorId } = body || {}

    if (!titulo || !resumen) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'INVALID_REQUEST', message: 'Faltan datos: titulo y resumen son obligatorios.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('aprendizajes')
      .insert({
        titulo,
        resumen,
        sector_id: sectorId ?? null,
        conversacion_json: Array.isArray(conversacion) ? conversacion : null,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'DB_ERROR', message: error.message }, { status: 500 })
    }

    return NextResponse.json<ApiResponse<{ id: number }>>({ 
      success: true, 
      data: { id: data?.id } 
    })

  } catch (e: any) {
    console.error('[API /api/aprender/save] Error:', e)
    return NextResponse.json<ApiResponse>({ 
      success: false, 
      error: 'INTERNAL_ERROR', 
      message: e?.message || 'Error al guardar el aprendizaje' 
    }, { status: 500 })
  }
}
