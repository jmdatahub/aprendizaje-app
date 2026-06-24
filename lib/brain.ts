/**
 * Cliente del "cerebro" (Claude del VPS).
 *
 * Permite que la propia app (web/móvil) use como motor de IA tu Claude del VPS
 * —tu suscripción, modelos top como Sonnet/Opus— en lugar de la API de pago de
 * OpenAI. Resultado: la app deja de tener coste de API.
 *
 * Si BRAIN_BASE_URL + BRAIN_TOKEN están configurados, todas las funciones de IA
 * de la app (tutor, test rápido, generación de resúmenes, recomendaciones…)
 * pasan por aquí automáticamente (ver lib/openai.ts, que enruta a este cliente).
 *
 * Contrato con el servidor del VPS (agent/brain-server.mjs):
 *   POST {BRAIN_BASE_URL}/complete
 *   headers: Authorization: Bearer <BRAIN_TOKEN>
 *   body: { messages: [{role,content}], json?: boolean, model?: string }
 *   resp: { ok: true, content: string } | { ok: false, error: string }
 */

export interface BrainMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface BrainOptions {
  json?: boolean
  temperature?: number
  maxTokens?: number
  model?: string
}

export function isBrainConfigured(): boolean {
  return Boolean(process.env.BRAIN_BASE_URL && process.env.BRAIN_TOKEN)
}

/** Timeout generoso: arrancar `claude` en el VPS puede tardar unos segundos. */
const BRAIN_TIMEOUT_MS = 120_000

export async function brainComplete(messages: BrainMessage[], opts: BrainOptions = {}): Promise<string> {
  const base = (process.env.BRAIN_BASE_URL || '').replace(/\/$/, '')
  const token = process.env.BRAIN_TOKEN || ''
  if (!base || !token) throw new Error('Brain no configurado')

  const res = await fetch(`${base}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages,
      json: !!opts.json,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      model: opts.model || process.env.BRAIN_MODEL || undefined,
    }),
    signal: AbortSignal.timeout(BRAIN_TIMEOUT_MS),
  })

  if (!res.ok) throw new Error(`Brain HTTP ${res.status}`)
  const data = (await res.json().catch(() => null)) as { ok?: boolean; content?: string; error?: string } | null
  if (!data || !data.ok || typeof data.content !== 'string') {
    throw new Error(data?.error || 'Respuesta del cerebro inválida')
  }
  return data.content
}
