/**
 * OpenAI Service - Uses the /api/chat endpoint
 * Uses centralized API client for consistent error handling and timeouts
 */

import { apiPost } from '@/shared/utils/api';
import { ApiResponse } from '@/shared/types/api';

interface ChatApiResponseData {
  respuesta: string;
  engine?: string;
  aieState?: any;
  aieAnalysis?: any;
}

interface RecommendationsApiResponseData {
  relatedTopics: string[];
  subtopics: string[];
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
    const resp = await apiPost<ApiResponse<ChatApiResponseData>>('/api/chat', {
      messages: history,
      context,
      config
    });
    
    if (!resp.success || !resp.data) {
      throw new Error(resp.message || 'Unknown error');
    }

    return {
      respuesta: resp.data.respuesta || '',
      content: resp.data.respuesta || '',
      engine: resp.data.engine,
      aieState: resp.data.aieState,
      aieAnalysis: resp.data.aieAnalysis
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
    const resp = await apiPost<ApiResponse<RecommendationsApiResponseData>>('/api/recommendations', { history });
    
    return {
      relatedTopics: resp.data?.relatedTopics || [],
      subtopics: resp.data?.subtopics || []
    };
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return {
      relatedTopics: [],
      subtopics: []
    };
  }
};

export const generateChatTitle = async (history: any[]): Promise<string | null> => {
  try {
    const resp = await apiPost<ApiResponse<{ title: string }>>('/api/chat/title', { messages: history });
    return resp.success ? resp.data?.title || null : null;
  } catch (error) {
    console.error('Error fetching chat title:', error);
    return null;
  }
};
