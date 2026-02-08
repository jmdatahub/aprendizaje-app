import { NextResponse } from 'next/server'
import { getOpenAIClient, isStubMode } from '@/lib/openai'
import { ApiResponse } from '@/shared/types/api'

export const runtime = 'nodejs'

interface RecommendationsResponse extends ApiResponse {
  relatedTopics?: string[];
  subtopics?: string[];
  engine?: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json<RecommendationsResponse>({ 
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Messages array is required' 
      }, { status: 400 })
    }

    const openai = getOpenAIClient()
    const isStub = isStubMode()

    if (isStub || !openai) {
      return NextResponse.json<RecommendationsResponse>({
        success: true,
        relatedTopics: ['Tema Relacionado 1 (Stub)', 'Tema Relacionado 2 (Stub)'],
        subtopics: ['Subtema A (Stub)', 'Subtema B (Stub)', 'Subtema C (Stub)'],
        engine: 'stub'
      })
    }

    // Construir contexto breve (últimos 3 mensajes)
    const contextMessages = messages.slice(-3).map((m: any) => `${m.role}: ${m.content}`).join('\n')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un experto pedagogo. Analiza la conversación y sugiere:
          1. 3 temas relacionados para seguir aprendiendo (amplios).
          2. 3 subtemas específicos para profundizar en lo actual.
          
          Responde EXCLUSIVAMENTE en formato JSON:
          {
            "relatedTopics": ["Tema 1", "Tema 2", "Tema 3"],
            "subtopics": ["Subtema 1", "Subtema 2", "Subtema 3"]
          }`
        },
        {
          role: 'user',
          content: `Conversación reciente:\n${contextMessages}\n\nGenera recomendaciones.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    })

    const rawContent = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(rawContent)

    return NextResponse.json<ApiResponse<{
      relatedTopics: string[];
      subtopics: string[];
      engine: string;
    }>>({
      success: true,
      data: {
        relatedTopics: parsed.relatedTopics || [],
        subtopics: parsed.subtopics || [],
        engine: 'openai-gpt-4o-mini'
      }
    })

  } catch (error: any) {
    console.error('Error generating recommendations:', error)
    return NextResponse.json<RecommendationsResponse>({ 
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message 
    }, { status: 500 })
  }
}
