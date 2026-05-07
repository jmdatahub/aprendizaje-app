// GET /api/habilidades/[id] - Obtiene detalle de habilidad con sesiones
// DELETE /api/habilidades/[id] - Elimina una habilidad

import { NextResponse } from 'next/server'
import { ApiResponse } from '@/shared/types/api'
import { isValidUUID, badRequest } from '@/lib/validate'
import { getSupabaseAnon } from '@/lib/supabaseAnonClient'

export const runtime = 'nodejs'


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
    if (!isValidUUID(id)) return badRequest('id inválido')
    const supabase = getSupabaseAnon()

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

    // Obtener sesiones (acotadas para evitar scans gigantes en habilidades muy practicadas)
    const { data: sesiones, error: sesionesError } = await supabase
      .from('sesiones_practica')
      .select('*')
      .eq('habilidad_id', id)
      .order('fecha', { ascending: false })
      .limit(1000)
    
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
    console.error('[habilidades/[id] GET] Error:', e?.message)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al obtener habilidad'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return badRequest('id inválido')
    const supabase = getSupabaseAnon()

    // Soft delete: marcar como eliminado en lugar de borrar
    const { error } = await supabase
      .from('habilidades')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null) // Solo si no está ya eliminado
    
    if (error) {
      console.error('[habilidades/[id] DELETE] DB error:', error?.message)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'DB_ERROR',
        message: 'Error al eliminar habilidad'
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Habilidad movida a papelera (se eliminará permanentemente en 15 días)'
    })
  } catch (e: any) {
    console.error('[habilidades/[id] DELETE] Error:', e?.message)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al eliminar habilidad'
    }, { status: 500 })
  }
}

// PATCH - Editar habilidad
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return badRequest('id inválido')
    const supabase = getSupabaseAnon()
    const body = await request.json()

    const { nombre, categorias, descripcion, nivel_percibido, objetivo_semanal_minutos } = body
    
    // Validate fields
    if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim().length === 0 || nombre.trim().length > 255)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'INVALID_REQUEST', message: 'Nombre inválido (máx. 255 caracteres)' }, { status: 400 })
    }
    if (descripcion !== undefined && descripcion !== null && (typeof descripcion !== 'string' || descripcion.length > 2000)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'INVALID_REQUEST', message: 'Descripción demasiado larga (máx. 2000)' }, { status: 400 })
    }
    if (objetivo_semanal_minutos !== undefined && objetivo_semanal_minutos !== null &&
        (typeof objetivo_semanal_minutos !== 'number' || objetivo_semanal_minutos < 0 || objetivo_semanal_minutos > 100000)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'INVALID_REQUEST', message: 'Objetivo semanal inválido' }, { status: 400 })
    }

    // Construir objeto de actualización solo con campos proporcionados
    const updateData: Record<string, any> = {}
    if (nombre !== undefined) updateData.nombre = nombre.trim()
    if (categorias !== undefined) updateData.categorias = categorias
    if (descripcion !== undefined) updateData.descripcion = descripcion?.trim() || null
    if (nivel_percibido !== undefined) updateData.nivel_percibido = nivel_percibido || null
    if (objetivo_semanal_minutos !== undefined) updateData.objetivo_semanal_minutos = objetivo_semanal_minutos || null
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'No hay campos para actualizar'
      }, { status: 400 })
    }
    
    const { data, error } = await supabase
      .from('habilidades')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()
    
    if (error) {
      console.error('[habilidades/[id] PATCH] DB error:', error?.message)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'DB_ERROR',
        message: 'Error al actualizar habilidad'
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data
    })
  } catch (e: any) {
    console.error('[habilidades/[id] PATCH] Error:', e?.message)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al actualizar habilidad'
    }, { status: 500 })
  }
}
