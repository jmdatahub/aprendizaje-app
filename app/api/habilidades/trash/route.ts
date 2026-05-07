// GET /api/habilidades/trash - Lista habilidades en papelera
// DELETE /api/habilidades/trash - Vacía papelera (elimina permanentemente las > 15 días)

import { NextResponse } from 'next/server'
import { ApiResponse } from '@/shared/types/api'
import { getSupabaseAnon } from '@/lib/supabaseAnonClient'

export const runtime = 'nodejs'


interface HabilidadEliminada {
  id: string
  nombre: string
  categoria: string | null
  deleted_at: string
  dias_restantes: number
}

export async function GET() {
  try {
    const supabase = getSupabaseAnon()
    
    const { data, error } = await supabase
      .from('habilidades')
      .select('id, nombre, categoria, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(500)
    
    if (error) {
      console.error('[habilidades/trash GET] DB error:', error?.message)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'DB_ERROR',
        message: 'Error al obtener papelera'
      }, { status: 500 })
    }

    // Calcular días restantes antes de eliminación permanente
    const ahora = new Date()
    const items: HabilidadEliminada[] = (data || []).map(h => {
      const eliminadoEn = new Date(h.deleted_at)
      const diasPasados = Math.floor((ahora.getTime() - eliminadoEn.getTime()) / (1000 * 60 * 60 * 24))
      const diasRestantes = Math.max(0, 15 - diasPasados)
      return { ...h, dias_restantes: diasRestantes }
    })

    return NextResponse.json<ApiResponse<{ items: HabilidadEliminada[] }>>({
      success: true,
      data: { items }
    })
  } catch (e: any) {
    console.error('[habilidades/trash GET] Error:', e?.message)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al obtener papelera'
    }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = getSupabaseAnon()
    
    // Eliminar permanentemente las que llevan más de 15 días
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() - 15)
    
    const { data, error } = await supabase
      .from('habilidades')
      .delete()
      .not('deleted_at', 'is', null)
      .lt('deleted_at', fechaLimite.toISOString())
      .select('id')
    
    if (error) {
      console.error('[habilidades/trash DELETE] DB error:', error?.message)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'DB_ERROR',
        message: 'Error al vaciar papelera'
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse<{ deleted: number }>>({
      success: true,
      message: `${data?.length || 0} habilidades eliminadas permanentemente`,
      data: { deleted: data?.length || 0 }
    })
  } catch (e: any) {
    console.error('[habilidades/trash DELETE] Error:', e?.message)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al vaciar papelera'
    }, { status: 500 })
  }
}
