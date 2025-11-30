/**
 * API client functions for the learning app
 */

interface ChatMessage {
  rol: string
  texto: string
}

// Alternative message format used in some components
interface ChatLike {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatResponse {
  respuesta: string
  content?: string // Alias for compatibility
  engine?: string
  error?: string
}

interface RecommendationsResponse {
  relatedTopics: string[]
  subtopics: string[]
  engine?: string
  error?: string
}

interface AprendizajeDraftResponse {
  titulo: string
  resumen: string
  tags?: string[]
  engine?: string
  error?: string
}

interface AprendizajeSaveResponse {
  ok: boolean
  id?: number
  error?: string
}

interface AprendizajeParams {
  conversacion: ChatMessage[] | ChatLike[]
  confirmar?: boolean
  titulo?: string
  resumen?: string
  sectorId?: number
}

/**
 * Convert ChatLike format to ChatMessage format
 */
function convertToChatMessage(message: ChatLike | ChatMessage): ChatMessage {
  if ('rol' in message && 'texto' in message) {
    return message as ChatMessage
  }
  const chatLike = message as ChatLike
  return {
    rol: chatLike.role === 'user' ? 'usuario' : 'asistente',
    texto: chatLike.content,
  }
}

/**
 * Send a chat message to the AI assistant
 */
/**
 * Send a chat message to the AI assistant
 */
export async function sendChatMessage(
  messages: { role: string; content: string }[],
  context?: string,
  config?: { verbosity?: 'concise' | 'normal' | 'detailed' }
): Promise<ChatResponse> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, context, config }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error sending chat message:', error)
    return {
      respuesta: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create a draft summary of the learning conversation
 * Supports both object-style and parameter-style calls
 */
export async function createAprendizajeDraft(
  conversacionOrParams: ChatMessage[] | ChatLike[] | AprendizajeParams,
  confirmar?: boolean,
  titulo?: string,
  resumen?: string,
  sectorId?: number
): Promise<AprendizajeDraftResponse | AprendizajeSaveResponse> {
  try {
    // Determine if called with object or individual parameters
    let params: Omit<AprendizajeParams, 'conversacion'> & { conversacion: ChatMessage[] }
    if (Array.isArray(conversacionOrParams)) {
      // Called with individual parameters - convert messages if needed
      params = {
        conversacion: conversacionOrParams.map(convertToChatMessage),
        confirmar,
        titulo,
        resumen,
        sectorId,
      }
    } else {
      // Called with object - convert messages if needed
      params = {
        ...conversacionOrParams,
        conversacion: conversacionOrParams.conversacion.map(convertToChatMessage),
      }
    }

    const response = await fetch('/api/aprender', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating aprendizaje draft:', error)
    // Return a response that satisfies both possible return types
    return {
      titulo: 'Error',
      resumen: 'No se pudo generar el resumen. Por favor, intenta de nuevo.',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as AprendizajeDraftResponse
  }
}

/**
 * Generate topic recommendations based on conversation history
 */
export async function generateRecommendations(
  messages: { role: string; content: string }[]
): Promise<RecommendationsResponse> {
  try {
    const response = await fetch('/api/recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error generating recommendations:', error)
    return {
      relatedTopics: [],
      subtopics: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
