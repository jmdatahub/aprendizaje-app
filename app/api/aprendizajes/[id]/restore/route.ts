// POST /api/aprendizajes/[id]/restore - Restaura un aprendizaje de la papelera

import { NextResponse } from 'next/server'
import { ApiResponse } from '@/shared/types/api'
import { isValidRouteId, badRequest } from '@/lib/validate'
import { getSupabaseAnon } from '@/lib/supabaseAnonClient'

export const runtime = 'nodejs'


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidRouteId(id)) return badRequest('id inválido')
    const supabase = getSupabaseAnon()

    // Restaurar: poner deleted_at a null
    const { data, error } = await supabase
      .from('aprendizajes')
      .update({ deleted_at: null })
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .select('id, titulo')
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'NOT_FOUND',
          message: 'Aprendizaje no encontrado en papelera'
        }, { status: 404 })
      }
      console.error('[aprendizajes restore] DB error:', error?.message)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'DB_ERROR',
        message: 'Error al restaurar aprendizaje'
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse<{ id: string; titulo: string }>>({
      success: true,
      message: `"${data.titulo}" restaurado correctamente`,
      data
    })
  } catch (e: any) {
    console.error('[aprendizajes restore] Error:', e?.message)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al restaurar aprendizaje'
    }, { status: 500 })
  }
}
