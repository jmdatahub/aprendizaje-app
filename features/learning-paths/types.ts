export interface PathStep {
  id: string;
  learningId: string;
  title: string;
  description: string; // Why this step is next
  completed: boolean;
  sectorName: string; // To know where to find the original item
}

export interface LearningPath {
  id: string;
  title: string;
  sector: string; // e.g., "Nutrición", "Historia"
  steps: PathStep[];
  createdAt: number;
  updatedAt: number;
  completed: boolean;
  currentStepIndex: number;
}
