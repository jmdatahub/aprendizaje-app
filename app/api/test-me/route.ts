import { NextResponse } from 'next/server'
import { getOpenAIClient, isStubMode } from '@/lib/openai'
import { ApiResponse } from '@/shared/types/api'

export const runtime = 'nodejs'

interface TestMeResponse extends ApiResponse {
  data?: {
    questions?: string[];
  };
}

export async function POST(req: Request) {
  try {
    const { content } = await req.json().catch(() => ({}))

    if (!content) {
      return NextResponse.json<TestMeResponse>({ 
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Content is required' 
      }, { status: 400 })
    }

    const openai = getOpenAIClient()
    const isStub = isStubMode()

    if (isStub || !openai) {
      return NextResponse.json<TestMeResponse>({ 
        success: true,
        data: {
          questions: [
            "¿Cuál es la idea principal de este texto? (Stub)",
            "¿Cómo se relaciona esto con tu vida diaria? (Stub)",
            "¿Qué ejemplo podrías dar para explicar esto? (Stub)"
          ] 
        }
      })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un generador de preguntas de repaso rápido.
          Tu tarea es leer el contenido proporcionado y generar EXACTAMENTE 3 preguntas cortas, claras y directas para poner a prueba la comprensión del usuario.
          
          Reglas:
          - Genera solo 3 preguntas.
          - Las preguntas deben ser abiertas pero específicas.
          - No incluyas respuestas.
          - No numeres las preguntas, devuélvelas en formato JSON puro: { "questions": ["pregunta 1", "pregunta 2", "pregunta 3"] }`
        },
        {
          role: 'user',
          content: `Genera 3 preguntas de repaso para este contenido:\n\n${content}`
        }
      ],
      response_format: { type: "json_object" }
    })

    const responseContent = completion.choices[0].message.content
    const parsed = JSON.parse(responseContent || '{"questions": []}')
    
    return NextResponse.json<TestMeResponse>({ 
      success: true, 
      data: { questions: parsed.questions || [] } 
    })

  } catch (error: any) {
    console.error('Error generating questions:', error)
    return NextResponse.json<TestMeResponse>({ 
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message 
    }, { status: 500 })
  }
}
