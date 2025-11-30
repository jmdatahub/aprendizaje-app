import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getOpenAIClient, isStubMode } from '@/lib/openai'
import { ApiResponse } from '@/shared/types/api'

export const runtime = 'nodejs'

interface AprenderResponse extends ApiResponse {
  id?: number;
  titulo?: string;
  resumen?: string;
  tags?: string[];
  sector_id?: number | null;
  engine?: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const { confirmar, conversacion, titulo, resumen, sectorId } = body || {}

    // POST confirmar === true → guardar en public.aprendizajes
    if (confirmar === true) {
      if (!titulo || !resumen) {
        return NextResponse.json<AprenderResponse>(
          { success: false, error: 'INVALID_REQUEST', message: 'Faltan datos: titulo y resumen son obligatorios.' },
          { status: 400 }
        )
      }

      const { data, error } = await supabase
        .from('aprendizajes')
        .insert({
          titulo,
          resumen,
          sector_id: sectorId ?? null,
          conversacion_json: Array.isArray(conversacion) ? conversacion : null,
        })
        .select('id')
        .single()

      if (error) {
        return NextResponse.json<AprenderResponse>({ success: false, error: 'DB_ERROR', message: error.message }, { status: 500 })
      }

      return NextResponse.json<AprenderResponse>({ success: true, id: data?.id })
    }

    // POST no-confirmar → generar propuesta (stub u OpenAI)
    if (!Array.isArray(conversacion)) {
      return NextResponse.json<AprenderResponse>(
        { success: false, error: 'INVALID_REQUEST', message: 'Conversacion invalida: debe ser un array.' },
        { status: 400 }
      )
    }

    const openai = getOpenAIClient()
    const isStub = isStubMode()

    if (isStub || !openai) {
      return NextResponse.json<AprenderResponse>({
        success: true,
        titulo: 'Resumen provisional',
        resumen: '• Idea 1\n• Idea 2\n• Idea 3',
        engine: 'stub',
      })
    }

    // OpenAI v4 (gpt-4o-mini)
    try {
      const plano = conversacion
        .map((m: any) => `${m?.rol === 'usuario' ? 'Usuario' : 'Asistente'}: ${m?.texto ?? ''}`)
        .join('\n')

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un sintetizador didáctico inteligente.
            Analiza la conversación y genera un objeto JSON con:
            1. "titulo": Un título breve y atractivo (sin markdown).
            2. "resumen": Un resumen en markdown con viñetas (4-6 puntos clave).
            3. "tags": Un array de strings con máximo 3 palabras clave (ej: ["Salud", "Nutrición"]).
            4. "sector_id": El ID del sector más apropiado para este contenido, eligiendo de esta lista:
               1: Salud y Rendimiento
               2: Ciencias Naturales
               3: Ciencias Físicas
               4: Matemáticas y Lógica
               5: Tecnología y Computación
               6: Historia y Filosofía
               7: Artes y Cultura
               8: Economía y Negocios
               9: Sociedad y Psicología
            
            Si no encaja claramente, usa tu mejor criterio.`,
          },
          { role: 'user', content: plano },
        ],
        response_format: { type: 'json_object' },
      })

      const raw = completion.choices?.[0]?.message?.content || '{}'
      const parsed = JSON.parse(raw)

      return NextResponse.json<AprenderResponse>({
        success: true,
        titulo: parsed.titulo || 'Resumen de aprendizaje',
        resumen: parsed.resumen || '• No se pudo generar el resumen.',
        tags: parsed.tags || [],
        sector_id: parsed.sector_id || null,
        engine: 'openai-gpt-4o-mini',
      })
    } catch (e: any) {
      console.error('Error en OpenAI:', e)
      return NextResponse.json<AprenderResponse>({
        success: true, // Fallback to stub is considered success for UX
        titulo: 'Resumen provisional',
        resumen: '• Idea 1\n• Idea 2\n• Idea 3',
        sector_id: null,
        engine: 'stub',
      })
    }
  } catch (e: any) {
    return NextResponse.json<AprenderResponse>({ success: false, error: 'INTERNAL_ERROR', message: e?.message || 'Error interno' }, { status: 500 })
  }
}

