// GET /api/aprendizajes
// - Devuelve todos los aprendizajes básicos desde Supabase
// - Estructura: { data: Array<{ id: number, sector_id: number | null, titulo: string, resumen: string, created_at: string }> }
// - Manejo de errores con status 500

import { NextResponse } from 'next/server'
import { ApiResponse } from '@/shared/types/api'
import { getSupabaseAnon } from '@/lib/supabaseAnonClient'

export const runtime = 'nodejs'

// Cliente anónimo inline

interface AprendizajeData {
  id: number;
  sector_id: number | null;
  titulo: string;
  resumen: string;
  created_at: string;
}

interface Agregado {
  sector_id: number | null;
  total: number;
}

export async function GET() {
  try {
    const supabase = getSupabaseAnon()
    
    // Lista completa (excluir eliminados)
    const { data, error } = await supabase
      .from('aprendizajes')
      .select('id,sector_id,titulo,resumen,created_at')
      .is('deleted_at', null) // Excluir eliminados
      .order('created_at', { ascending: false })
      .limit(500)
      
    if (error) {
      console.error('[API /api/aprendizajes] Supabase error fetching aprendizajes:', error)
      throw new Error(error.message)
    }

    // Agregados por sector (equivalente a: select sector_id, count(*) as total group by sector_id)
    const agregadosMap = new Map<number | null, number>()
    try {
      for (const a of data || []) {
        const sid = a.sector_id ?? null
        if (!agregadosMap.has(sid)) agregadosMap.set(sid, 0)
        agregadosMap.set(sid, (agregadosMap.get(sid) || 0) + 1)
      }
    } catch (err) {
      console.error('[API /api/aprendizajes] Error processing agregados:', err)
    }
    const agregados: Agregado[] = Array.from(agregadosMap.entries()).map(([sector_id, total]) => ({ sector_id, total }))

    // Sectores desbloqueados por "progreso" si la tabla existe; si falla, seguimos sin bloquear la respuesta
    let progreso: number[] = []
    try {
      const { data: progData, error: eProg } = await supabase
        .from('progreso')
        .select('sector_id')
      
      if (eProg) {
        console.warn('[API /api/aprendizajes] Warning fetching progreso (might not exist yet):', eProg.message)
      } else if (Array.isArray(progData)) {
        progreso = progData.map((p: { sector_id: unknown }) => p.sector_id).filter((x: unknown): x is number => typeof x === 'number')
      }
    } catch (err) {
      console.warn('[API /api/aprendizajes] Error in progreso block:', err)
    }

    return NextResponse.json<ApiResponse<{ items: AprendizajeData[], agregados: Agregado[], progreso: number[] }>>({ 
      success: true,
      data: {
        items: data as AprendizajeData[], 
        agregados, 
        progreso 
      }
    })
  } catch (e) {
    console.error('[aprendizajes GET] Error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al obtener aprendizajes'
    }, { status: 500 })
  }
}





