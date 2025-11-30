/**
 * Unified message type for chat conversations
 */
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
}

/**
 * Legacy format - for backward compatibility
 */
export interface ChatMessage {
  rol: string
  texto: string
}

/**
 * Convert Message to ChatMessage format
 */
export function toApiFormat(message: Message): ChatMessage {
  return {
    rol: message.role === 'user' ? 'usuario' : 'asistente',
    texto: message.content,
  }
}

/**
 * Convert ChatMessage to Message format
 */
export function fromApiFormat(chatMessage: ChatMessage, id?: string): Message {
  return {
    id: id || crypto.randomUUID(),
    role: chatMessage.rol === 'usuario' ? 'user' : 'assistant',
    content: chatMessage.texto,
  }
}
