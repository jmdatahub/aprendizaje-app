// GET /api/aprendizajes/trash - Lista aprendizajes en papelera

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

interface AprendizajeEliminado {
  id: string
  titulo: string
  deleted_at: string
  dias_restantes: number
}

export async function GET() {
  try {
    const supabase = getSupabase()
    
    const { data, error } = await supabase
      .from('aprendizajes')
      .select('id, titulo, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    
    if (error) {
      console.error('[API aprendizajes/trash] Error:', error)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'DB_ERROR',
        message: error.message
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
    console.error('[API aprendizajes/trash] Fatal error:', e)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: e?.message || 'Error al obtener papelera'
    }, { status: 500 })
  }
}
