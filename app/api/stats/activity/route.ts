import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 1. Obtener aprendizajes (created_at)
    const { data: aprendizajes, error: errorAprendizajes } = await supabase
      .from('aprendizajes')
      .select('created_at')
      .eq('user_id', 'user_2rTkX...') // TODO: Usar ID real si hay auth
    
    if (errorAprendizajes) throw errorAprendizajes

    // 2. Obtener sesiones de práctica (fecha, duracion, habilidad_id)
    // Necesitamos hacer join con habilidades para saber el nombre de la habilidad
    const { data: habilidades, error: errorHabilidades } = await supabase
      .from('habilidades')
      .select('id, nombre, nivel, sesiones(fecha, duracion_segundos)')
      .eq('active', true)

    if (errorHabilidades) throw errorHabilidades

    // 3. Procesar datos para el frontend
    const activityLog: { date: string, type: 'learning' | 'practice', details?: any }[] = []
    
    // Aprendizajes
    (aprendizajes || []).forEach((a: any) => {
      activityLog.push({
        date: a.created_at,
        type: 'learning'
      })
    })

    // Sesiones
    const skillsStats: Record<string, { id: string, name: string, totalSeconds: number, sessionsCount: number }> = {}

    habilidades?.forEach((h: any) => {
      skillsStats[h.id] = {
        id: h.id,
        name: h.nombre,
        totalSeconds: 0,
        sessionsCount: 0
      }

      if (h.sesiones && Array.isArray(h.sesiones)) {
        h.sesiones.forEach((s: any) => {
          activityLog.push({
            date: s.fecha,
            type: 'practice',
            details: { duration: s.duracion_segundos, skillId: h.id }
          })
          
          skillsStats[h.id].totalSeconds += s.duracion_segundos
          skillsStats[h.id].sessionsCount += 1
        })
      }
    })

    // Ordenar log por fecha descendente
    activityLog.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      success: true,
      data: {
        activityLog,
        skillsStats: Object.values(skillsStats)
      }
    })

  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { success: false, error: 'Error al cargar estadísticas' },
      { status: 500 }
    )
  }
}
