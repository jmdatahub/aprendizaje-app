// POST /api/habilidades/[id]/sesiones - Registra una nueva sesión de práctica

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponse } from '@/shared/types/api'
import { calcularNivel } from '@/shared/constants/habilidades'

export const runtime = 'nodejs'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

interface SesionCreada {
  id: string
  duracion_segundos: number
  resumen: string | null
  fecha: string
  nuevo_tiempo_total: number
  nuevo_nivel: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = getSupabase()
    
    const { duracion_segundos, resumen } = body

    if (!duracion_segundos || duracion_segundos <= 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'La duración debe ser mayor a 0'
      }, { status: 400 })
    }

    // Obtener habilidad actual
    const { data: habilidad, error: getError } = await supabase
      .from('habilidades')
      .select('tiempo_total_segundos')
      .eq('id', id)
      .single()
    
    if (getError) {
      if (getError.code === 'PGRST116') {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'NOT_FOUND',
          message: 'Habilidad no encontrada'
        }, { status: 404 })
      }
      throw new Error(getError.message)
    }

    // Calcular nuevo tiempo total y nivel
    const nuevoTiempoTotal = (habilidad.tiempo_total_segundos || 0) + duracion_segundos
    const nuevoNivel = calcularNivel(nuevoTiempoTotal)

    // Insertar sesión
    const { data: sesion, error: insertError } = await supabase
      .from('sesiones_practica')
      .insert({
        habilidad_id: id,
        duracion_segundos,
        resumen: resumen?.trim() || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('[API sesiones] Insert error:', insertError)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'DB_ERROR',
        message: insertError.message
      }, { status: 500 })
    }

    // Actualizar habilidad con nuevo tiempo y nivel
    const { error: updateError } = await supabase
      .from('habilidades')
      .update({
        tiempo_total_segundos: nuevoTiempoTotal,
        nivel: nuevoNivel.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('[API sesiones] Update error:', updateError)
      // No fallamos aquí, la sesión ya se guardó
    }

    const result: SesionCreada = {
      ...sesion,
      nuevo_tiempo_total: nuevoTiempoTotal,
      nuevo_nivel: nuevoNivel.id
    }

    return NextResponse.json<ApiResponse<SesionCreada>>({
      success: true,
      data: result
    })
  } catch (e: any) {
    console.error('[API sesiones] Fatal error:', e)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: e?.message || 'Error al guardar sesión'
    }, { status: 500 })
  }
}
