import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/lib/validate'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const habilidadId = searchParams.get('habilidad_id')

    if (!habilidadId || !isValidUUID(habilidadId)) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_PARAM',
        message: 'Parámetro habilidad_id inválido'
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('recordatorios')
      .select('*')
      .eq('habilidad_id', habilidadId)
      .eq('active', true)
      .order('dia_semana', { ascending: true })
      .order('hora', { ascending: true })
      .limit(200)

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error('[recordatorios GET] Error:', e instanceof Error ? e.message : 'unknown')
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al obtener recordatorios'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { habilidad_id, dia_semana, hora } = body

    if (!habilidad_id || !isValidUUID(habilidad_id)) {
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST', message: 'habilidad_id inválido' }, { status: 400 })
    }

    const diaSemanaNum = Number(dia_semana)
    if (!Number.isInteger(diaSemanaNum) || diaSemanaNum < 0 || diaSemanaNum > 6) {
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST', message: 'dia_semana debe ser 0-6' }, { status: 400 })
    }

    if (!hora || typeof hora !== 'string' || !/^\d{2}:\d{2}(:\d{2})?$/.test(hora)) {
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST', message: 'Formato de hora inválido (HH:MM)' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('recordatorios')
      .insert({
        habilidad_id,
        dia_semana: diaSemanaNum,
        hora,
        email_enabled: true,
        active: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error('[recordatorios POST] Error:', e instanceof Error ? e.message : 'unknown')
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al crear recordatorio'
    }, { status: 500 })
  }
}
