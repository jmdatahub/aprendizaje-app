import { NextResponse } from 'next/server'
import { getOpenAIClient, isStubMode } from '@/lib/openai'
import { ApiResponse } from '@/shared/types/api'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export const runtime = 'nodejs'

interface TitleRequest {
  messages: any[];
}

interface TitleResponse extends ApiResponse {
  title?: string;
}

export async function POST(req: Request) {
  try {
    // Rate limit: 20 req/min per IP — endpoint hits OpenAI
    const ip = getClientIp(req)
    const { success: allowed } = await rateLimit(`chat-title:${ip}`, 20, 60)
    if (!allowed) {
      return NextResponse.json<TitleResponse>(
        { success: false, error: 'RATE_LIMITED', message: 'Too many requests' },
        { status: 429 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { messages } = body as TitleRequest

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json<TitleResponse>({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Messages array is required and cannot be empty'
      }, { status: 400 })
    }

    if (messages.length > 100) {
      return NextResponse.json<TitleResponse>({ success: false, error: 'INVALID_REQUEST', message: 'Too many messages' }, { status: 400 })
    }

    // Validate each message has bounded content
    for (const msg of messages) {
      if (typeof msg?.content !== 'string' || msg.content.length > 8000) {
        return NextResponse.json<TitleResponse>({
          success: false, error: 'INVALID_REQUEST', message: 'Message content too long or invalid'
        }, { status: 400 })
      }
    }

    const openai = getOpenAIClient()
    const isStub = isStubMode()

    const systemPrompt = `Eres un asistente que genera títulos para hilos de chat.
    Analiza la conversación y genera un título de MÁXIMO 3 a 4 palabras.
    El título debe ser descriptivo pero muy breve.
    Ejemplo: "Receta pastel chocolate", "Duda sobre Newton", "Plan viaje Japón".
    NO uses comillas ni puntos finales. Responde SOLO con el título.`

    if (isStub || !openai) {
      return NextResponse.json<ApiResponse<{ title: string }>>({
        success: true,
        data: { title: "Chat Formativo IA" }
      })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-6) // Solo enviamos los últimos mensajes para ahorrar tokens y contexto
      ],
      temperature: 0.5,
      max_tokens: 20
    })

    const title = completion.choices[0]?.message?.content?.trim().replace(/['".]/g, '') || 'Chat de Aprendizaje'

    return NextResponse.json<ApiResponse<{ title: string }>>({
      success: true,
      data: { title }
    })

  } catch (error: any) {
    console.error('[chat/title] Error:', error?.message || 'unknown')
    return NextResponse.json<TitleResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred'
    }, { status: 500 })
  }
}
