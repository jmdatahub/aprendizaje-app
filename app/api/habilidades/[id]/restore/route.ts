// POST /api/habilidades/[id]/restore - Restaura una habilidad de la papelera

import { NextResponse } from 'next/server'
import { ApiResponse } from '@/shared/types/api'
import { isValidUUID, badRequest } from '@/lib/validate'
import { getSupabaseAnon } from '@/lib/supabaseAnonClient'

export const runtime = 'nodejs'


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return badRequest('id inválido')
    const supabase = getSupabaseAnon()

    // Restaurar: poner deleted_at a null
    const { data, error } = await supabase
      .from('habilidades')
      .update({ deleted_at: null })
      .eq('id', id)
      .not('deleted_at', 'is', null) // Solo si está eliminada
      .select('id, nombre')
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'NOT_FOUND',
          message: 'Habilidad no encontrada en papelera'
        }, { status: 404 })
      }
      console.error('[habilidades restore] DB error:', error?.message)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'DB_ERROR',
        message: 'Error al restaurar habilidad'
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse<{ id: string; nombre: string }>>({
      success: true,
      message: `"${data.nombre}" restaurada correctamente`,
      data
    })
  } catch (e: any) {
    console.error('[habilidades restore] Error:', e?.message)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al restaurar habilidad'
    }, { status: 500 })
  }
}
