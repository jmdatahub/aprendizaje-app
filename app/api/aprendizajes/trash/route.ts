// GET /api/aprendizajes/trash - Lista aprendizajes en papelera

import { NextResponse } from 'next/server'
import { ApiResponse } from '@/shared/types/api'
import { getSupabaseAnon } from '@/lib/supabaseAnonClient'

export const runtime = 'nodejs'


interface AprendizajeEliminado {
  id: string
  titulo: string
  deleted_at: string
  dias_restantes: number
}

export async function GET() {
  try {
    const supabase = getSupabaseAnon()
    
    const { data, error } = await supabase
      .from('aprendizajes')
      .select('id, titulo, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(500)
    
    if (error) {
      console.error('[aprendizajes/trash GET] DB error:', error?.message)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'DB_ERROR',
        message: 'Error al obtener papelera'
      }, { status: 500 })
    }

    // Calcular días restantes
    const ahora = new Date()
    const items: AprendizajeEliminado[] = (data || []).map(a => {
      const eliminadoEn = new Date(a.deleted_at)
      const diasPasados = Math.floor((ahora.getTime() - eliminadoEn.getTime()) / (1000 * 60 * 60 * 24))
      const diasRestantes = Math.max(0, 15 - diasPasados)
      return { ...a, dias_restantes: diasRestantes }
    })

    return NextResponse.json<ApiResponse<{ items: AprendizajeEliminado[] }>>({
      success: true,
      data: { items }
    })
  } catch (e: any) {
    console.error('[aprendizajes/trash GET] Error:', e?.message)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al obtener papelera'
    }, { status: 500 })
  }
}
