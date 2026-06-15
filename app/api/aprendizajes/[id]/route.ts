// DELETE /api/aprendizajes/[id] - Soft delete de aprendizaje

import { NextResponse } from 'next/server'
import { ApiResponse } from '@/shared/types/api'
import { isValidRouteId, badRequest } from '@/lib/validate'
import { getSupabaseAnon } from '@/lib/supabaseAnonClient'

export const runtime = 'nodejs'


export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidRouteId(id)) return badRequest('id inválido')
    const supabase = getSupabaseAnon()
    
    // Soft delete: marcar como eliminado
    const { error } = await supabase
      .from('aprendizajes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
    
    if (error) {
      console.error('[aprendizajes DELETE] DB error:', error?.message)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'DB_ERROR',
        message: 'Error al eliminar aprendizaje'
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Aprendizaje movido a papelera (se eliminará en 15 días)'
    })
  } catch (e) {
    console.error('[aprendizajes DELETE] Error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al eliminar aprendizaje'
    }, { status: 500 })
  }
}
