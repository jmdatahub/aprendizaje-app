// GET /api/habilidades - Lista todas las habilidades del usuario
// POST /api/habilidades - Crea una nueva habilidad

import { NextResponse } from 'next/server'
import { ApiResponse } from '@/shared/types/api'
import { calcularNivel, EXPERIENCIA_PREVIA } from '@/shared/constants/habilidades'
import { getSupabaseAnon } from '@/lib/supabaseAnonClient'

export const runtime = 'nodejs'

// Crear cliente Supabase inline para evitar problemas de importación

export interface HabilidadData {
  id: string
  nombre: string
  categoria: string | null
  descripcion: string | null
  guia_generada: string | null
  tiempo_total_segundos: number
  nivel: string
  experiencia_previa: string
  created_at: string
}

export async function GET() {
  try {
    console.log('[API /api/habilidades] Starting GET request...')
    
    const supabase = getSupabaseAnon()
    
    const { data, error } = await supabase
      .from('habilidades')
      .select('*')
      .is('deleted_at', null) // Excluir eliminadas
      .order('updated_at', { ascending: false })
      .limit(500)
    
    if (error) {
      console.error('[habilidades GET] DB error:', error?.message)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'DB_ERROR',
        message: 'Error al obtener habilidades'
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse<{ items: HabilidadData[] }>>({
      success: true,
      data: { items: data || [] }
    })
  } catch (e) {
    console.error('[habilidades GET] Fatal error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al obtener habilidades'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAnon()
    const body = await request.json()
    
    const { nombre, categorias, descripcion, experiencia_previa, horas_manuales, nivel_percibido, objetivo_semanal_minutos } = body

    if (!nombre?.trim()) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'El nombre de la habilidad es obligatorio'
      }, { status: 400 })
    }

    if (typeof nombre !== 'string' || nombre.trim().length > 255) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'INVALID_REQUEST', message: 'Nombre demasiado largo (máx. 255 caracteres)' }, { status: 400 })
    }
    if (descripcion && (typeof descripcion !== 'string' || descripcion.length > 2000)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'INVALID_REQUEST', message: 'Descripción demasiado larga (máx. 2000 caracteres)' }, { status: 400 })
    }
    if (horas_manuales !== undefined && (typeof horas_manuales !== 'number' || horas_manuales < 0 || horas_manuales > 100000)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'INVALID_REQUEST', message: 'Valor de horas inválido' }, { status: 400 })
    }

    // Calcular tiempo inicial: priorizar horas manuales, sino usar experiencia previa
    let tiempoInicial = 0
    if (horas_manuales && horas_manuales > 0) {
      tiempoInicial = horas_manuales * 3600 // Convertir horas a segundos
    } else {
      const exp = EXPERIENCIA_PREVIA.find(e => e.id === experiencia_previa) || EXPERIENCIA_PREVIA[0]
      tiempoInicial = exp.horas * 3600
    }
    
    const nivelInicial = calcularNivel(tiempoInicial)
    
    const { data, error } = await supabase
      .from('habilidades')
      .insert({
        nombre: nombre.trim(),
        categorias: Array.isArray(categorias) ? categorias : [],
        descripcion: descripcion?.trim() || null,
        experiencia_previa: experiencia_previa || null,
        tiempo_total_segundos: tiempoInicial,
        nivel: nivelInicial.id,
        nivel_percibido: nivel_percibido || null,
        objetivo_semanal_minutos: objetivo_semanal_minutos || null
      })
      .select()
      .single()

    if (error) {
      console.error('[habilidades POST] DB error:', error?.message)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'DB_ERROR',
        message: 'Error al crear la habilidad'
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse<HabilidadData>>({
      success: true,
      data
    })
  } catch (e) {
    console.error('[habilidades POST] Fatal error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al crear habilidad'
    }, { status: 500 })
  }
}

