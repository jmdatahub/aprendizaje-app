// POST /api/habilidades/[id]/restore - Restaura una habilidad de la papelera

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponse } from '@/shared/types/api'
import { isValidUUID, badRequest } from '@/lib/validate'

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
    if (!isValidUUID(id)) return badRequest('id inválido')
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
