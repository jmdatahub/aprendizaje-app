import OpenAI from 'openai';
import { isBrainConfigured, brainComplete, type BrainMessage } from '@/lib/brain';

/**
 * Router de proveedor de IA. Orden de preferencia:
 *   1. Cerebro del VPS (Claude vía suscripción) — SIN coste de API.  [BRAIN_BASE_URL + BRAIN_TOKEN]
 *   2. OpenAI (API de pago).                                          [OPENAI_API_KEY]
 *   3. Stub (sin IA): respuestas simuladas.                           [USE_STUB_AI=1 o nada configurado]
 *
 * Truco clave: cuando el cerebro está configurado, getOpenAIClient() devuelve un
 * "shim" que imita la interfaz de OpenAI (`.chat.completions.create`). Así TODAS
 * las rutas de la app (chat/tutor, test-me, aprender/generate, recommendations,
 * sorpresas, etc.) funcionan SIN CAMBIOS y dejan de pagar API.
 */

const API_KEY = process.env.OPENAI_API_KEY;

function brainConfigured() {
  return isBrainConfigured();
}

function openaiConfigured() {
  return Boolean(API_KEY);
}

/** Stub solo si se fuerza, o si no hay NI cerebro NI OpenAI. */
export const isStubMode = () =>
  process.env.USE_STUB_AI === '1' || (!brainConfigured() && !openaiConfigured());

// --- Singletons ---
let client: OpenAI | null = null;
let brainShim: OpenAI | null = null;

/** Cliente OpenAI real (lazy). */
function getRealOpenAI(): OpenAI | null {
  if (!API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: API_KEY });
  return client;
}

type CreateParams = {
  messages?: BrainMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type?: string };
  model?: string;
};

/**
 * Shim con forma de cliente OpenAI que enruta al cerebro del VPS. Solo implementa
 * el subconjunto que usa la app: chat.completions.create() no-streaming, leyendo
 * choices[0].message.content. Devuelve una respuesta con la misma forma.
 */
function createBrainShim(): OpenAI {
  const shim = {
    chat: {
      completions: {
        async create(params: CreateParams) {
          const messages = (params?.messages || []) as BrainMessage[];
          const json = params?.response_format?.type === 'json_object';
          try {
            const content = await brainComplete(messages, {
              json,
              temperature: params?.temperature,
              maxTokens: params?.max_tokens,
            });
            return { choices: [{ message: { role: 'assistant', content } }] };
          } catch (err) {
            // Resiliencia opcional: si el cerebro falla y se permite, tirar de OpenAI.
            const fallback = process.env.BRAIN_FALLBACK_OPENAI === '1' ? getRealOpenAI() : null;
            if (fallback) {
              console.warn('[brain] fallo del cerebro, usando OpenAI como respaldo:', err instanceof Error ? err.message : String(err));
              // @ts-expect-error params es compatible con la API real
              return fallback.chat.completions.create(params);
            }
            throw err;
          }
        },
      },
    },
  };
  return shim as unknown as OpenAI;
}

/**
 * Devuelve el cliente de IA activo (cerebro VPS, OpenAI o null para stub).
 * El tipo es OpenAI para que las rutas existentes no necesiten cambios.
 */
export function getOpenAIClient(): OpenAI | null {
  if (process.env.USE_STUB_AI === '1') return null;
  if (brainConfigured()) {
    if (!brainShim) brainShim = createBrainShim();
    return brainShim;
  }
  return getRealOpenAI();
}

// Helper types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionConfig {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: OpenAI.Chat.Completions.ChatCompletionCreateParams['response_format'];
}

/**
 * Wrapper para chat completions que gestiona el modo stub automáticamente.
 * Funciona con cualquiera de los tres proveedores (cerebro/OpenAI/stub).
 */
export async function generateChatCompletion(
  messages: ChatMessage[],
  config: CompletionConfig = {}
): Promise<string | null> {
  const ai = getOpenAIClient();

  if (!ai) {
    console.log('[AI Stub] Generating completion for:', messages.length, 'messages');
    return `(Stub) Response to: "${messages[messages.length - 1]?.content || '...'}"`;
  }

  try {
    const response = await ai.chat.completions.create({
      model: config.model || 'gpt-4o-mini',
      messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.max_tokens ?? 500,
      response_format: config.response_format,
    });

    return response.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('[AI Error]', error);
    throw error;
  }
}
