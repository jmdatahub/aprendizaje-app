// GET /api/habilidades/[id] - Obtiene detalle de habilidad con sesiones
// DELETE /api/habilidades/[id] - Elimina una habilidad

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

interface SesionData {
  id: string
  duracion_segundos: number
  resumen: string | null
  fecha: string
}

interface HabilidadConSesiones {
  id: string
  nombre: string
  categoria: string | null
  descripcion: string | null
  guia_generada: string | null
  tiempo_total_segundos: number
  nivel: string
  experiencia_previa: string
  created_at: string
  sesiones: SesionData[]
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabase()
    
    // Obtener habilidad (excluir eliminadas)
    const { data: habilidad, error: habilidadError } = await supabase
      .from('habilidades')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null) // No mostrar si está en papelera
      .single()
    
    if (habilidadError) {
      if (habilidadError.code === 'PGRST116') {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'NOT_FOUND',
          message: 'Habilidad no encontrada'
        }, { status: 404 })
      }
      throw new Error(habilidadError.message)
    }

    // Obtener sesiones
    const { data: sesiones, error: sesionesError } = await supabase
      .from('sesiones_practica')
      .select('*')
      .eq('habilidad_id', id)
      .order('fecha', { ascending: false })
    
    if (sesionesError) {
      console.error('[API /api/habilidades/[id]] Sesiones error:', sesionesError)
    }

    const result: HabilidadConSesiones = {
      ...habilidad,
      sesiones: sesiones || []
    }

    return NextResponse.json<ApiResponse<HabilidadConSesiones>>({
      success: true,
      data: result
    })
  } catch (e: any) {
    console.error('[API /api/habilidades/[id]] Fatal error:', e)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: e?.message || 'Error al obtener habilidad'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabase()
    
    // Soft delete: marcar como eliminado en lugar de borrar
    const { error } = await supabase
      .from('habilidades')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null) // Solo si no está ya eliminado
    
    if (error) {
      console.error('[API /api/habilidades/[id]] Soft delete error:', error)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'DB_ERROR',
        message: error.message
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Habilidad movida a papelera (se eliminará permanentemente en 15 días)'
    })
  } catch (e: any) {
    console.error('[API /api/habilidades/[id]] Fatal error:', e)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: e?.message || 'Error al eliminar habilidad'
    }, { status: 500 })
  }
}
