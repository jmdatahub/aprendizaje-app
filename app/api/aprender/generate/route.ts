import { NextResponse } from 'next/server'
import { getOpenAIClient, isStubMode } from '@/lib/openai'
import { ApiResponse } from '@/shared/types/api'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export const runtime = 'nodejs'

interface GenerateResponse {
  titulo: string;
  resumen: string;
  tags: string[];
  sector_id: number | null;
  suggested_sections: number[];
  engine: string;
}

export async function POST(req: Request) {
  try {
    // Rate limit: 10 req/min per IP — this endpoint hits OpenAI
    const ip = getClientIp(req)
    const { success: allowed } = await rateLimit(`aprender-generate:${ip}`, 10, 60)
    if (!allowed) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'RATE_LIMITED', message: 'Too many requests' },
        { status: 429 }
      )
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const { conversacion } = body || {}

    if (!Array.isArray(conversacion) || conversacion.length === 0 || conversacion.length > 200) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'INVALID_REQUEST', message: 'Conversacion inválida: debe ser un array con máx. 200 entradas.' },
        { status: 400 }
      )
    }

    // Per-entry validation: bound text length to prevent token-cost abuse and
    // ensure each entry has the expected shape.
    let totalChars = 0
    for (const m of conversacion) {
      if (!m || typeof m !== 'object') {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'INVALID_REQUEST', message: 'Entrada inválida en conversacion' },
          { status: 400 }
        )
      }
      const texto = (m as { texto?: unknown }).texto
      if (texto !== undefined && (typeof texto !== 'string' || texto.length > 4000)) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'INVALID_REQUEST', message: 'Entrada con texto demasiado largo (máx 4000 caracteres).' },
          { status: 400 }
        )
      }
      totalChars += typeof texto === 'string' ? texto.length : 0
      if (totalChars > 100_000) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'INVALID_REQUEST', message: 'Conversacion total demasiado larga.' },
          { status: 400 }
        )
      }
    }

    const openai = getOpenAIClient()
    const isStub = isStubMode()

    if (isStub || !openai) {
      return NextResponse.json<ApiResponse<GenerateResponse>>({
        success: true,
        data: {
          titulo: 'Resumen provisional',
          resumen: '• Idea 1\n• Idea 2\n• Idea 3',
          tags: [],
          sector_id: null,
          suggested_sections: [],
          engine: 'stub',
        }
      })
    }

    const plano = conversacion
      .map((m: { rol?: string; texto?: string }) => `${m?.rol === 'usuario' ? 'Usuario' : 'Asistente'}: ${m?.texto ?? ''}`)
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
          4. "suggested_sections": Un array con los IDs de los sectores MÁS relevantes para este contenido (máximo 3, ordenados por relevancia). 
             Lista de sectores disponibles:
             1: Salud y Rendimiento
             2: Ciencias Naturales
             3: Ciencias Físicas
             4: Matemáticas y Lógica
             5: Tecnología y Computación
             6: Historia y Filosofía
             7: Artes y Cultura
             8: Economía y Negocios
             9: Sociedad y Psicología`,
        },
        { role: 'user', content: plano },
      ],
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw)

    let suggestedSections: number[] = [];
    if (Array.isArray(parsed.suggested_sections)) {
      suggestedSections = parsed.suggested_sections.map((s: unknown) => Number(s)).filter((n: number) => n >= 1 && n <= 9);
    }

    const responseData: GenerateResponse = {
      titulo: parsed.titulo || 'Resumen de aprendizaje',
      resumen: parsed.resumen || '• No se pudo generar el resumen.',
      tags: parsed.tags || [],
      sector_id: suggestedSections[0] || null,
      suggested_sections: suggestedSections,
      engine: 'openai-gpt-4o-mini',
    }

    return NextResponse.json<ApiResponse<GenerateResponse>>({
      success: true,
      data: responseData
    })

  } catch (e) {
    console.error('[aprender/generate] Error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al generar el resumen'
    }, { status: 500 })
  }
}
