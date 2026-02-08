/**
 * Learning Service - Uses /api/aprender to generate learning summaries with OpenAI
 * Uses centralized API client for consistent error handling and timeouts
 */

import { apiPost } from '@/shared/utils/api';

export interface AprendizajeDraftResponse {
  titulo: string;
  resumen: string;
  sector_id: string | number | null;
  suggested_sections?: number[];
  tags: string[];
}

interface ConversacionMessage {
  rol?: string;
  texto?: string;
  role?: string;
  content?: string;
}

interface ApiAprendizajeResponse {
  success: boolean;
  titulo?: string;
  resumen?: string;
  sector_id?: string | number;
  suggested_sections?: number[];
  tags?: string[];
  message?: string;
}

export const createAprendizajeDraft = async (data: {
  conversacion?: ConversacionMessage[];
  messages?: ConversacionMessage[];
  context?: string;
  confirmar?: boolean;
}): Promise<AprendizajeDraftResponse> => {
  try {
    // Support both 'conversacion' and 'messages' input
    const rawMessages = data.conversacion || data.messages || [];
    
    // Normalize messages to the format expected by /api/aprender
    const conversacion = rawMessages.map((m) => {
      // Handle both {rol, texto} and {role, content} formats
      if (m.rol !== undefined || m.texto !== undefined) {
        return { rol: m.rol, texto: m.texto };
      }
      return {
        rol: m.role === 'user' ? 'usuario' : 'asistente',
        texto: m.content
      };
    });

    const result = await apiPost<ApiAprendizajeResponse>('/api/aprender', {
      conversacion,
      confirmar: data.confirmar ?? false
    });
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to generate summary');
    }

    return {
      titulo: result.titulo || 'Aprendizaje Nuevo',
      resumen: result.resumen || 'No se pudo generar el resumen.',
      sector_id: result.sector_id || null,
      suggested_sections: result.suggested_sections || [],
      tags: result.tags || []
    };
  } catch (error) {
    console.error('Error generating learning draft:', error);
    
    // Fallback: generate a basic summary from the messages
    const rawMessages = data.conversacion || data.messages || [];
    
    const assistantMessages = rawMessages
      .filter((m) => m.rol === 'asistente' || m.role === 'assistant')
      .map((m) => m.texto || m.content || '')
      .join('\n\n');
    
    return {
      titulo: 'Error al generar',
      resumen: assistantMessages.slice(0, 1000) || 'No se pudo generar el resumen.',
      sector_id: data.context || null,
      tags: []
    };
  }
};
