import { NextResponse } from 'next/server'
import { getOpenAIClient, isStubMode } from '@/lib/openai'
import { ApiResponse } from '@/shared/types/api'

export const runtime = 'nodejs'

interface EditRequest {
  currentSummary: string;
  instruction: string;
}

interface EditResponse extends ApiResponse {
  updatedSummary?: string;
  engine?: string;
}

export async function POST(req: Request) {
  try {
    const { currentSummary, instruction } = await req.json() as EditRequest

    if (!currentSummary || !instruction) {
      return NextResponse.json<EditResponse>({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'currentSummary and instruction are required'
      }, { status: 400 })
    }

    const openai = getOpenAIClient()
    const isStub = isStubMode()

    if (isStub || !openai) {
      return NextResponse.json<EditResponse>({
        success: true,
        updatedSummary: currentSummary + '\n\n(Editado con instrucción: ' + instruction + ')',
        engine: 'stub'
      })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un editor de textos educativos. 
Tu trabajo es modificar un resumen de aprendizaje según las instrucciones del usuario.
Mantén el formato en Markdown con viñetas.
Devuelve SOLO el texto editado, sin explicaciones ni comentarios.
Si la instrucción no tiene sentido, devuelve el texto original.`
        },
        {
          role: 'user',
          content: `RESUMEN ACTUAL:\n${currentSummary}\n\nINSTRUCCIÓN DEL USUARIO:\n${instruction}\n\nDevuelve el resumen editado:`
        }
      ],
      temperature: 0.5,
      max_tokens: 1000
    })

    const updatedSummary = completion.choices?.[0]?.message?.content?.trim() || currentSummary

    return NextResponse.json<EditResponse>({
      success: true,
      updatedSummary,
      engine: 'openai-gpt-4o-mini'
    })

  } catch (error: any) {
    console.error('Error editing summary:', error)
    return NextResponse.json<EditResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Error interno'
    }, { status: 500 })
  }
}
