// GET /api/aprendizajes
// - Devuelve todos los aprendizajes básicos desde Supabase
// - Estructura: { data: Array<{ id: number, sector_id: number | null, titulo: string, resumen: string, created_at: string }> }
// - Manejo de errores con status 500

import { NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@/lib/supabaseRoute'
import { ApiResponse } from '@/shared/types/api'

export const runtime = 'nodejs'

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

interface AprendizajesResponse extends ApiResponse {
  data?: AprendizajeData[];
  agregados?: Agregado[];
  progreso?: number[];
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseForRequest(request)
    
    // Lista completa (para UI que la consuma)
    const { data, error } = await supabase
      .from('aprendizajes')
      .select('id,sector_id,titulo,resumen,created_at')
      .order('created_at', { ascending: false })
      
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
        progreso = progData.map((p: any) => p.sector_id).filter((x: any): x is number => typeof x === 'number')
      }
    } catch (err) {
      console.warn('[API /api/aprendizajes] Error in progreso block:', err)
    }

    return NextResponse.json<AprendizajesResponse>({ 
      success: true,
      data: data as AprendizajeData[], 
      agregados, 
      progreso 
    })
  } catch (e: any) {
    console.error('[API /api/aprendizajes] Fatal error:', e)
    const msg = e?.message || 'Error al obtener aprendizajes'
    return NextResponse.json<AprendizajesResponse>({ 
      success: false,
      error: 'INTERNAL_ERROR',
      message: msg 
    }, { status: 500 })
  }
}





