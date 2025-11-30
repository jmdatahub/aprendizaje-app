import { LearningPath, PathStep } from '../types';

const STORAGE_KEY = 'learning_paths';

export const getLearningPaths = (): LearningPath[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading learning paths:', error);
    return [];
  }
};

export const saveLearningPath = (path: LearningPath): void => {
  try {
    const paths = getLearningPaths();
    const index = paths.findIndex(p => p.id === path.id);
    
    if (index >= 0) {
      paths[index] = path;
    } else {
      paths.push(path);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
  } catch (error) {
    console.error('Error saving learning path:', error);
  }
};

export const deleteLearningPath = (id: string): void => {
  try {
    const paths = getLearningPaths();
    const filtered = paths.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting learning path:', error);
  }
};

export const getActivePath = (): LearningPath | undefined => {
  const paths = getLearningPaths();
  // Return the most recently updated incomplete path, or just the last one
  return paths.sort((a, b) => b.updatedAt - a.updatedAt).find(p => !p.completed);
};

export const updatePathProgress = (pathId: string, stepId: string, completed: boolean): LearningPath | null => {
  const paths = getLearningPaths();
  const path = paths.find(p => p.id === pathId);
  
  if (!path) return null;

  const stepIndex = path.steps.findIndex(s => s.id === stepId);
  if (stepIndex === -1) return null;

  path.steps[stepIndex].completed = completed;
  path.updatedAt = Date.now();
  
  // Update current step index to the first incomplete step
  const firstIncomplete = path.steps.findIndex(s => !s.completed);
  path.currentStepIndex = firstIncomplete === -1 ? path.steps.length : firstIncomplete;
  
  // Check if all completed
  path.completed = path.steps.every(s => s.completed);

  saveLearningPath(path);
  return path;
};
