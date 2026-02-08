import { apiPost } from '@/shared/utils/api';

interface EditSummaryResponse {
  success: boolean;
  updatedSummary?: string;
  message?: string;
}

export const editSummaryWithAI = async (
  currentSummary: string,
  instruction: string
): Promise<string> => {
  try {
    const response = await apiPost<EditSummaryResponse>('/api/aprender/edit', {
      currentSummary,
      instruction
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to edit summary');
    }

    return response.updatedSummary || currentSummary;
  } catch (error) {
    console.error('Error editing summary with AI:', error);
    return currentSummary;
  }
};
