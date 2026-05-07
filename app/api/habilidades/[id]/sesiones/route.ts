// POST /api/habilidades/[id]/sesiones - Registra una nueva sesión de práctica

import { NextResponse } from 'next/server'
import { ApiResponse } from '@/shared/types/api'
import { calcularNivel } from '@/shared/constants/habilidades'
import { isValidUUID, badRequest } from '@/lib/validate'
import { getSupabaseAnon } from '@/lib/supabaseAnonClient'

export const runtime = 'nodejs'


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
    if (!isValidUUID(id)) return badRequest('id inválido')
    const body = await request.json()
    const supabase = getSupabaseAnon()

    const { duracion_segundos, resumen } = body

    if (!duracion_segundos || typeof duracion_segundos !== 'number' || !Number.isFinite(duracion_segundos) || duracion_segundos <= 0 || duracion_segundos > 86400) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'La duración debe ser mayor a 0 y menor a 24 horas'
      }, { status: 400 })
    }

    if (resumen && (typeof resumen !== 'string' || resumen.length > 2000)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'INVALID_REQUEST', message: 'Resumen demasiado largo (máx. 2000)' }, { status: 400 })
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

    // Calcular nuevo tiempo total y nivel — cap absurd values to prevent overflow
    const previo = Number(habilidad.tiempo_total_segundos || 0)
    const nuevoTiempoTotal = Math.min(previo + duracion_segundos, 1_000_000_000) // ~31 yrs
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
      console.error('[sesiones] Insert error:', insertError?.message)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'DB_ERROR',
        message: 'Error al guardar sesión'
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
    console.error('[sesiones] Error:', e?.message)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al guardar sesión'
    }, { status: 500 })
  }
}
