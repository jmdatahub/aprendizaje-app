import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const habilidadId = searchParams.get('habilidad_id')

    if (!habilidadId) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_PARAM',
        message: 'Falta el parámetro habilidad_id'
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('recordatorios')
      .select('*')
      .eq('habilidad_id', habilidadId)
      .eq('active', true)
      .order('dia_semana', { ascending: true })
      .order('hora', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data
    })
  } catch (e: any) {
    console.error('[API /api/recordatorios] Error:', e)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: e?.message || 'Error al obtener recordatorios'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { habilidad_id, dia_semana, hora } = body

    if (!habilidad_id || dia_semana === undefined || !hora) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Faltan campos requeridos'
      }, { status: 400 })
    }
    
    // Verificar límite? Opcional.
    
    const { data, error } = await supabase
      .from('recordatorios')
      .insert({
        habilidad_id,
        dia_semana,
        hora,
        email_enabled: true,
        active: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data
    })
  } catch (e: any) {
    console.error('[API /api/recordatorios] Error:', e)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: e?.message || 'Error al crear recordatorio'
    }, { status: 500 })
  }
}
