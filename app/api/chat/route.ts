import { NextResponse } from 'next/server'
import { getOpenAIClient, isStubMode } from '@/lib/openai'
import { analyzeUserMessage } from '@/lib/aie/analyzer'
import { getSystemInstructions, shouldInsertMiniEval, getMiniEvalPrompt } from '@/lib/aie/adapter'
import { AIEState } from '@/lib/aie/types'
import { ApiResponse } from '@/shared/types/api'

export const runtime = 'nodejs'

interface ChatRequest {
  messages: any[];
  context?: string;
  config?: {
    verbosity?: 'concise' | 'normal' | 'detailed';
  };
  aieState?: AIEState;
}

interface ChatResponse extends ApiResponse {
  respuesta?: string;
  engine?: string;
  aieState?: AIEState;
  aieAnalysis?: any;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { messages, context, config, aieState: prevAieState } = body as ChatRequest

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json<ChatResponse>({ 
        success: false, 
        error: 'INVALID_REQUEST',
        message: 'Messages array is required' 
      }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1]
    const userQuery = lastMessage?.content || ''

    // 1. AIE Analysis (Evaluación implícita)
    let nextAIEState: AIEState = prevAieState || {
      level: 'medium',
      gaps: [],
      lastEvaluation: 0,
      messageCount: 0
    }

    let analysisResult = null
    const openai = getOpenAIClient()
    const isStub = isStubMode()

    // Solo analizamos si hay un mensaje de usuario y no estamos en modo stub puro (o si queremos simularlo)
    if (openai && !isStub && userQuery) {
      try {
        // Analizar el último mensaje con el historial reciente
        const history = messages.slice(0, -1)
        analysisResult = await analyzeUserMessage(userQuery, history)
        
        // Actualizar estado
        nextAIEState = {
          level: analysisResult.level,
          gaps: [...nextAIEState.gaps, ...analysisResult.detectedGaps],
          lastEvaluation: Date.now(),
          messageCount: nextAIEState.messageCount + 1
        }
      } catch (err) {
        console.warn('AIE Analysis failed:', err)
      }
    }

    // 2. Generar Instrucciones Adaptativas
    const aieInstructions = getSystemInstructions(nextAIEState)
    
    // Mini-evaluación ocasional
    let miniEvalPrompt = ''
    if (shouldInsertMiniEval(nextAIEState.messageCount)) {
      miniEvalPrompt = getMiniEvalPrompt(context || 'General', nextAIEState.level)
    }

    const systemPrompt = `Eres un tutor IA experto y empático.
    Contexto: ${context || 'General'}
    
    INSTRUCCIONES ADAPTATIVAS:
    ${aieInstructions}
    
    ${miniEvalPrompt ? `\nNOTA: Incluye esta pequeña evaluación al final: "${miniEvalPrompt}"` : ''}
    
    Instrucciones generales:
    - Responde de manera clara y estructurada.
    - Usa Markdown para formato.
    `

    // 3. Llamada a OpenAI (o Stub)
    if (isStub || !openai) {
      // Simulación de respuesta con "pensamiento" AIE
      await new Promise(r => setTimeout(r, 800))
      return NextResponse.json<ChatResponse>({
        success: true,
        respuesta: `(Stub AIE Active) He analizado tu pregunta sobre "${context}". \n\nNivel detectado: **${nextAIEState.level}**.\n\nRespuesta simulada a: "${userQuery}"`,
        engine: 'stub-aie',
        aieState: nextAIEState,
        aieAnalysis: analysisResult
      })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
    })

    const respuesta = completion.choices[0]?.message?.content || 'No pude generar una respuesta.'

    return NextResponse.json<ApiResponse<{
      respuesta: string;
      engine: string;
      aieState: AIEState;
      aieAnalysis: any;
    }>>({
      success: true,
      data: {
        respuesta,
        engine: 'gpt-4o-mini-aie',
        aieState: nextAIEState,
        aieAnalysis: analysisResult
      }
    })

  } catch (error: any) {
    console.error('Error in chat endpoint:', error)
    return NextResponse.json<ChatResponse>({ 
      success: false, 
      error: 'INTERNAL_ERROR',
      message: error.message 
    }, { status: 500 })
  }
}
