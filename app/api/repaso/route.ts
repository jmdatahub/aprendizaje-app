// Genera preguntas de repaso basadas en los aprendizajes guardados (stub local, sin modelos externos).

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@/shared/types/api'

export const runtime = 'nodejs'

interface Pregunta {
  tipo: 'abierta' | 'vf';
  aprendizajeId: number;
  titulo: string;
  enunciado: string;
  respuestaCorrecta: string;
}

interface RepasoResponse extends ApiResponse {
  preguntas?: Pregunta[];
}

export async function GET(request: Request) {
  try {
    // 1) Leer parámetros opcionales: limite, dias
    const { searchParams } = new URL(request.url)
    const limite = Number(searchParams.get('limite') || 8)
    const dias = Number(searchParams.get('dias') || 365)

    // 2) Calcular fecha mínima
    const desde = new Date()
    desde.setDate(desde.getDate() - dias)

    // 3) Obtener aprendizajes recientes
    const { data, error } = await supabase
      .from('aprendizajes')
      .select('id, titulo, resumen, contenido, created_at, sector_id')
      .gte('created_at', desde.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[repaso] error supabase', error)
      return NextResponse.json<RepasoResponse>({ 
        success: false,
        error: 'DB_ERROR',
        message: 'No se pudieron cargar aprendizajes' 
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json<RepasoResponse>({ success: true, preguntas: [] })
    }

    // 4) Generar preguntas stub simples
    const preguntas: Pregunta[] = []

    for (const ap of data) {
      const baseTexto = String((ap?.resumen || ap?.contenido || '')).trim()
      if (!baseTexto) continue

      const primeraFrase = baseTexto.split(/[.!?]/)[0].trim()
      if (!primeraFrase) continue

      // Pregunta abierta
      preguntas.push({
        tipo: 'abierta',
        aprendizajeId: ap.id,
        titulo: ap.titulo,
        enunciado: `Explica con tus palabras la idea principal de: "${ap.titulo}".`,
        respuestaCorrecta: primeraFrase,
      })

      // Verdadero/Falso simple
      preguntas.push({
        tipo: 'vf',
        aprendizajeId: ap.id,
        titulo: ap.titulo,
        enunciado: `Esta frase sobre "${ap.titulo}" es correcta: ${primeraFrase}`,
        respuestaCorrecta: 'verdadero',
      })

      if (preguntas.length >= limite) break
    }

    return NextResponse.json<RepasoResponse>({ success: true, preguntas })
  } catch (e: any) {
    console.error('[repaso] error inesperado', e)
    return NextResponse.json<RepasoResponse>({ 
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error generando preguntas de repaso' 
    }, { status: 500 })
  }
}

