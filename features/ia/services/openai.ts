/**
 * OpenAI Service - Uses the /api/chat endpoint
 * Uses centralized API client for consistent error handling and timeouts
 */

import { apiPost } from '@/shared/utils/api';

interface ChatApiResponse {
  success: boolean;
  respuesta?: string;
  engine?: string;
  aieState?: any;
  aieAnalysis?: any;
  message?: string;
}

interface RecommendationsApiResponse {
  relatedTopics?: string[];
  subtopics?: string[];
}

interface ChatResponse {
  respuesta: string;
  content: string;
  engine?: string;
  aieState?: any;
  aieAnalysis?: any;
  error?: boolean;
}

interface RecommendationsResponse {
  relatedTopics: string[];
  subtopics: string[];
}

export const sendChatMessage = async (
  history: any[], 
  context?: string, 
  config?: any
): Promise<ChatResponse> => {
  try {
    const data = await apiPost<ChatApiResponse>('/api/chat', {
      messages: history,
      context,
      config
    });
    
    if (!data.success) {
      throw new Error(data.message || 'Unknown error');
    }

    return {
      respuesta: data.respuesta || '',
      content: data.respuesta || '',
      engine: data.engine,
      aieState: data.aieState,
      aieAnalysis: data.aieAnalysis
    };
  } catch (error) {
    console.error('Error calling chat API:', error);
    return {
      respuesta: "Lo siento, hubo un problema conectando con el tutor IA. Por favor, intenta de nuevo.",
      content: "Lo siento, hubo un problema conectando con el tutor IA. Por favor, intenta de nuevo.",
      error: true
    };
  }
};

export const generateRecommendations = async (history: any[]): Promise<RecommendationsResponse> => {
  try {
    const data = await apiPost<RecommendationsApiResponse>('/api/recommendations', { history });
    
    return {
      relatedTopics: data.relatedTopics || [],
      subtopics: data.subtopics || []
    };
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return {
      relatedTopics: [],
      subtopics: []
    };
  }
};
