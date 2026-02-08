// DELETE /api/aprendizajes/[id] - Soft delete de aprendizaje

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponse } from '@/shared/types/api'

export const runtime = 'nodejs'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabase()
    
    // Soft delete: marcar como eliminado
    const { error } = await supabase
      .from('aprendizajes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
    
    if (error) {
      console.error('[API aprendizajes] Soft delete error:', error)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'DB_ERROR',
        message: error.message
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Aprendizaje movido a papelera (se eliminará en 15 días)'
    })
  } catch (e: any) {
    console.error('[API aprendizajes] Fatal error:', e)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: e?.message || 'Error al eliminar aprendizaje'
    }, { status: 500 })
  }
}
