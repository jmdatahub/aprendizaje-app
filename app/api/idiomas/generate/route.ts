/**
 * POST /api/idiomas/generate
 * Body: { word: string }
 * Genera una tarjeta de vocabulario (traducción, ejemplo en contexto, fonética,
 * tipo, nivel CEFR, sinónimos) usando el "cerebro" del VPS (sin coste de API).
 *
 * El cliente REVISA y edita antes de guardar. Si la palabra es A1–B1, el campo
 * `cefr` lo refleja para que el cliente avise "demasiado básica".
 */
import { NextResponse } from 'next/server'
import { brainComplete, isBrainConfigured } from '@/lib/brain'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const POS = ['noun', 'verb', 'adjective', 'adverb', 'phrasal_verb', 'idiom', 'expression', 'other']
const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const SYSTEM_PROMPT = `Eres un lexicógrafo experto inglés→español y profesor de inglés avanzado.
Dada UNA palabra o expresión en inglés, devuelves SOLO un objeto JSON (sin texto extra) con esta forma exacta:
{
  "word": string,                 // la palabra/expresión en inglés, normalizada (minúsculas salvo nombres propios)
  "translation": string,          // traducción natural al español (1-4 palabras)
  "partOfSpeech": one of ["noun","verb","adjective","adverb","phrasal_verb","idiom","expression","other"],
  "phonetic": string,             // transcripción IPA entre barras, p.ej. "/juːˈbɪkwɪtəs/"
  "example": string,              // UNA frase natural y útil en inglés que use la palabra y muestre su matiz (máx ~18 palabras)
  "exampleTranslation": string,   // traducción al español de esa frase
  "cefr": one of ["A1","A2","B1","B2","C1","C2"],  // nivel HONESTO de la palabra
  "synonyms": string[]            // 1-3 sinónimos en inglés del mismo registro (puede ir vacío)
}
Reglas:
- El ejemplo debe sonar natural (no artificial) y aclarar el uso, no complicarlo.
- Sé honesto con el nivel CEFR: si la palabra es básica (A1-B1) ponlo así.
- Responde ÚNICAMENTE el JSON.`

/**
 * Extrae un objeto JSON de la respuesta del cerebro de forma robusta:
 * 1) intenta parsear tal cual (se pidió con json:true);
 * 2) quita vallas markdown ```json ... ```;
 * 3) extrae el PRIMER objeto {...} balanceado (no greedy hasta el último }).
 */
function parseJsonObject(content: string): Record<string, unknown> | null {
  const tryParse = (s: string): Record<string, unknown> | null => {
    try {
      const v = JSON.parse(s)
      return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
  const direct = tryParse(content.trim())
  if (direct) return direct

  const fenced = content.replace(/```(?:json)?/gi, '').trim()
  const fromFence = tryParse(fenced)
  if (fromFence) return fromFence

  // Primer objeto balanceado.
  const start = fenced.indexOf('{')
  if (start === -1) return null
  let depth = 0
  for (let i = start; i < fenced.length; i++) {
    if (fenced[i] === '{') depth++
    else if (fenced[i] === '}') {
      depth--
      if (depth === 0) return tryParse(fenced.slice(start, i + 1))
    }
  }
  return null
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const { success: allowed } = await rateLimit(`idiomas-gen:${ip}`, 30, 60)
    if (!allowed) {
      return NextResponse.json({ ok: false, error: 'RATE_LIMITED' }, { status: 429 })
    }

    if (!isBrainConfigured()) {
      return NextResponse.json({ ok: false, error: 'BRAIN_NOT_CONFIGURED' }, { status: 503 })
    }

    const body = await request.json().catch(() => ({}))
    const raw = (body as { word?: unknown })?.word
    const word = typeof raw === 'string' ? raw.trim().slice(0, 80) : ''
    if (!word) {
      return NextResponse.json({ ok: false, error: 'MISSING_WORD' }, { status: 400 })
    }

    const content = await brainComplete(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Palabra en inglés: "${word}"` },
      ],
      { json: true, temperature: 0.4, maxTokens: 500 },
    )

    const parsed = parseJsonObject(content)
    if (!parsed) {
      return NextResponse.json({ ok: false, error: 'BAD_AI_RESPONSE' }, { status: 502 })
    }

    const str = (v: unknown, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
    const pos = str(parsed.partOfSpeech).toLowerCase()
    const cefr = str(parsed.cefr).toUpperCase()
    const card = {
      word: str(parsed.word, 80) || word,
      translation: str(parsed.translation, 200),
      partOfSpeech: POS.includes(pos) ? pos : 'other',
      phonetic: str(parsed.phonetic, 120) || undefined,
      example: str(parsed.example, 400),
      exampleTranslation: str(parsed.exampleTranslation, 400) || undefined,
      cefr: CEFR.includes(cefr) ? cefr : undefined,
      synonyms: Array.isArray(parsed.synonyms)
        ? (parsed.synonyms as unknown[]).slice(0, 5).map((s) => String(s).trim().slice(0, 60)).filter(Boolean)
        : [],
    }

    if (!card.translation) {
      return NextResponse.json({ ok: false, error: 'BAD_AI_RESPONSE' }, { status: 502 })
    }

    return NextResponse.json({ ok: true, card })
  } catch (e) {
    console.error('[idiomas/generate] error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
