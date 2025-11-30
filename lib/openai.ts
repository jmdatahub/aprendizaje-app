import OpenAI from 'openai';

// Configuration
const API_KEY = process.env.OPENAI_API_KEY;
const USE_STUB = !API_KEY || process.env.USE_STUB_AI === '1';

// Singleton instance (lazy init)
let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  if (USE_STUB) return null;
  
  if (!client) {
    client = new OpenAI({
      apiKey: API_KEY,
    });
  }
  
  return client;
}

export const isStubMode = () => USE_STUB;

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
 * Wrapper for chat completions that handles stub mode automatically.
 */
export async function generateChatCompletion(
  messages: ChatMessage[],
  config: CompletionConfig = {}
): Promise<string | null> {
  const openai = getOpenAIClient();

  if (!openai) {
    console.log('[OpenAI Stub] Generating completion for:', messages.length, 'messages');
    return `(Stub) Response to: "${messages[messages.length - 1]?.content || '...'}"`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: config.model || 'gpt-4o-mini',
      messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.max_tokens ?? 500,
      response_format: config.response_format,
    });

    return response.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('[OpenAI Error]', error);
    throw error;
  }
}
