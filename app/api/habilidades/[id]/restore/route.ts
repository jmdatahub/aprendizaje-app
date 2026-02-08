// POST /api/habilidades/[id]/restore - Restaura una habilidad de la papelera

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabase()
    
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
      console.error('[API restore] Error:', error)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'DB_ERROR',
        message: error.message
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse<{ id: string; nombre: string }>>({
      success: true,
      message: `"${data.nombre}" restaurada correctamente`,
      data
    })
  } catch (e: any) {
    console.error('[API restore] Fatal error:', e)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: e?.message || 'Error al restaurar habilidad'
    }, { status: 500 })
  }
}
