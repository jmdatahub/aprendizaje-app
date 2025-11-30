export type UnderstandingLevel = 'low' | 'medium' | 'high';

export interface CognitiveGap {
  topic: string;
  misconception?: string;
  missingConcept?: string;
  detectedAt: number; // Timestamp
}

export interface AIEState {
  level: UnderstandingLevel;
  gaps: CognitiveGap[];
  lastEvaluation: number; // Timestamp of last mini-eval
  messageCount: number;
}

export interface AIEAnalysis {
  level: UnderstandingLevel;
  detectedGaps: CognitiveGap[];
  sentiment: 'confused' | 'neutral' | 'confident';
}
