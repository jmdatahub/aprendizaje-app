import { AIEAnalysis, UnderstandingLevel, CognitiveGap } from './types';
import OpenAI from 'openai';

// Initialize OpenAI client (reuse env var)
const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

export async function analyzeUserMessage(
  message: string, 
  history: any[]
): Promise<AIEAnalysis> {
  try {
    // If no API key or client, return default
    if (!client) {
      return {
        level: 'medium',
        detectedGaps: [],
        sentiment: 'neutral'
      };
    }

    const systemPrompt = `
      Eres un experto analista pedagógico. Tu tarea es evaluar el nivel de comprensión del usuario y detectar lagunas cognitivas basándote en su último mensaje y el contexto reciente.
      
      Analiza:
      1. Nivel de vocabulario y precisión técnica.
      2. Claridad en la formulación de preguntas.
      3. Posibles errores conceptuales o contradicciones.
      
      Clasifica el nivel de comprensión (level) en:
      - 'low': Confuso, vocabulario básico, errores fundamentales.
      - 'medium': Preguntas claras, vocabulario estándar, comprensión general correcta.
      - 'high': Vocabulario técnico, preguntas profundas, matices avanzados.
      
      Detecta lagunas (gaps) si el usuario muestra una idea equivocada clara.
      
      Devuelve SOLO un JSON con este formato:
      {
        "level": "low" | "medium" | "high",
        "gaps": [ { "topic": "string", "misconception": "string" } ] (o array vacío),
        "sentiment": "confused" | "neutral" | "confident"
      }
    `;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Último mensaje del usuario: "${message}". Contexto previo: ${history.slice(-3).map(m => m.content).join(' | ')}` }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No content from analysis');

    const result = JSON.parse(content);

    return {
      level: result.level || 'medium',
      detectedGaps: (result.gaps || []).map((g: any) => ({
        topic: g.topic,
        misconception: g.misconception,
        detectedAt: Date.now()
      })),
      sentiment: result.sentiment || 'neutral'
    };

  } catch (error) {
    console.error('AIE Analysis Error:', error);
    // Fallback
    return {
      level: 'medium',
      detectedGaps: [],
      sentiment: 'neutral'
    };
  }
}
