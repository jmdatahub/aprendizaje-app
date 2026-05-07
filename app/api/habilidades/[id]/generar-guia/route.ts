// POST /api/habilidades/[id]/generar-guia
// Genera una guía de aprendizaje personalizada usando IA

import { NextResponse } from 'next/server'
import { getOpenAIClient, isStubMode } from '@/lib/openai'
import { ApiResponse } from '@/shared/types/api'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { isValidUUID, badRequest } from '@/lib/validate'
import { getSupabaseAnon } from '@/lib/supabaseAnonClient'

export const runtime = 'nodejs'


const STUB_GUIA = `## 🎯 Guía de Aprendizaje

### Nivel Actual
Estás empezando tu camino. ¡Ánimo!

### Pasos Recomendados
1. **Fundamentos** - Dedica las primeras 10 horas a conceptos básicos
2. **Práctica diaria** - 30 minutos al día es mejor que 3 horas una vez
3. **Proyectos pequeños** - Aplica lo aprendido en ejercicios prácticos

### Recursos Sugeridos
- YouTube: Busca tutoriales para principiantes
- Libros: Busca guías introductorias del tema
- Comunidades: Únete a grupos de práctica

### Meta a Corto Plazo
Llegar a 25 horas de práctica con sesiones consistentes.

---
*Esta es una guía de ejemplo. Configura tu API key de OpenAI para guías personalizadas.*
`

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limit: 5 req/min per IP — endpoint hits OpenAI with up to 800 tokens
    const ip = getClientIp(request)
    const { success: allowed } = await rateLimit(`generar-guia:${ip}`, 5, 60)
    if (!allowed) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'RATE_LIMITED', message: 'Too many requests' },
        { status: 429 }
      )
    }

    const { id } = await params
    if (!isValidUUID(id)) return badRequest('id inválido')
    const supabase = getSupabaseAnon()
    
    // 1. Obtener habilidad
    const { data: habilidad, error: habError } = await supabase
      .from('habilidades')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()
    
    if (habError || !habilidad) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'NOT_FOUND',
        message: 'Habilidad no encontrada'
      }, { status: 404 })
    }

    // 2. Obtener sesiones para contexto
    const { data: sesiones } = await supabase
      .from('sesiones_practica')
      .select('duracion_segundos, resumen, fecha')
      .eq('habilidad_id', id)
      .order('fecha', { ascending: false })
      .limit(10)

    const openai = getOpenAIClient()
    const isStub = isStubMode()
    
    let guia: string

    if (isStub || !openai) {
      // Modo stub: devolver guía de ejemplo
      guia = STUB_GUIA
    } else {
      // Modo real: generar con IA
      const horasTotales = Math.floor(habilidad.tiempo_total_segundos / 3600)
      const sesionesInfo = sesiones?.map(s => 
        `- ${Math.round(s.duracion_segundos / 60)} min${s.resumen ? `: ${s.resumen}` : ''}`
      ).join('\n') || 'Sin sesiones registradas'

      const prompt = `Eres un experto en aprendizaje y desarrollo de habilidades.
      
Genera una guía de aprendizaje personalizada para alguien que está practicando:
- Habilidad: ${habilidad.nombre}
- Descripción/objetivo: ${habilidad.descripcion || 'No especificado'}
- Nivel actual basado en horas: ${habilidad.nivel}
- Experiencia previa declarada: ${habilidad.experiencia_previa}
- Tiempo total practicado: ${horasTotales} horas
- Últimas sesiones:
${sesionesInfo}

Genera una guía en español con formato Markdown que incluya:
1. Evaluación del nivel actual
2. 3-5 pasos concretos para mejorar
3. Recursos recomendados (tipos de recursos, no URLs específicas)
4. Meta a corto plazo (próximas 10-20 horas)
5. Consejos para mantener la motivación

Sé específico para esta habilidad. Máximo 400 palabras.`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800
      })

      guia = completion.choices[0]?.message?.content || STUB_GUIA
    }

    // 3. Guardar guía en DB
    const { error: updateError } = await supabase
      .from('habilidades')
      .update({ guia_generada: guia })
      .eq('id', id)

    if (updateError) {
      console.error('[API generar-guia] Update error:', updateError)
    }

    return NextResponse.json<ApiResponse<{ guia: string }>>({
      success: true,
      data: { guia }
    })

  } catch (e: any) {
    console.error('[API generar-guia] Fatal error:', e?.message)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred'
    }, { status: 500 })
  }
}
