import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@/shared/types/api'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const { conversacion, titulo, resumen, sectorId } = body || {}

    if (!titulo || !resumen) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'INVALID_REQUEST', message: 'Faltan datos: titulo y resumen son obligatorios.' },
        { status: 400 }
      )
    }

    if (typeof titulo !== 'string' || titulo.trim().length > 255) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'INVALID_REQUEST', message: 'Título inválido o demasiado largo' }, { status: 400 })
    }
    if (typeof resumen !== 'string' || resumen.trim().length > 5000) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'INVALID_REQUEST', message: 'Resumen demasiado largo' }, { status: 400 })
    }
    if (conversacion !== undefined && !Array.isArray(conversacion)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'INVALID_REQUEST', message: 'Conversación inválida' }, { status: 400 })
    }
    if (Array.isArray(conversacion) && conversacion.length > 200) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'INVALID_REQUEST', message: 'Conversación demasiado larga' }, { status: 400 })
    }

    // Per-entry size validation to prevent storing massive blobs
    if (Array.isArray(conversacion)) {
      let total = 0
      for (const m of conversacion) {
        if (!m || typeof m !== 'object') {
          return NextResponse.json<ApiResponse>({ success: false, error: 'INVALID_REQUEST', message: 'Entrada inválida' }, { status: 400 })
        }
        const t = (m as { texto?: unknown }).texto
        if (t !== undefined && (typeof t !== 'string' || t.length > 4000)) {
          return NextResponse.json<ApiResponse>({ success: false, error: 'INVALID_REQUEST', message: 'Entrada con texto demasiado largo' }, { status: 400 })
        }
        total += typeof t === 'string' ? t.length : 0
        if (total > 200_000) {
          return NextResponse.json<ApiResponse>({ success: false, error: 'INVALID_REQUEST', message: 'Conversación total demasiado grande' }, { status: 400 })
        }
      }
    }

    // sector_id must be a small int (1-9) or null — not arbitrary user input
    let safeSectorId: number | null = null
    if (sectorId !== undefined && sectorId !== null) {
      const n = Number(sectorId)
      if (!Number.isInteger(n) || n < 1 || n > 9) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'INVALID_REQUEST', message: 'sectorId inválido' }, { status: 400 })
      }
      safeSectorId = n
    }

    const { data, error } = await supabase
      .from('aprendizajes')
      .insert({
        titulo: titulo.trim(),
        resumen: resumen.trim(),
        sector_id: safeSectorId,
        conversacion_json: Array.isArray(conversacion) ? conversacion : null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[aprender/save] DB error:', error?.message)
      return NextResponse.json<ApiResponse>({ success: false, error: 'DB_ERROR', message: 'Error al guardar en base de datos' }, { status: 500 })
    }

    return NextResponse.json<ApiResponse<{ id: number }>>({ 
      success: true, 
      data: { id: data?.id } 
    })

  } catch (e) {
    console.error('[aprender/save] Unexpected error:', e instanceof Error ? e.message : 'unknown')
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al guardar el aprendizaje'
    }, { status: 500 })
  }
}
