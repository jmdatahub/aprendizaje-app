import { OperationType, DifficultyLevel } from '../utils/mathGameUtils';

export type GameMode = 'timed' | 'free' | 'smart';

export interface GameSession {
  id: string;
  timestamp: number;
  mode: GameMode;
  operation: OperationType;
  level: DifficultyLevel;
  durationSeconds: number | null; // null for free mode if not tracked, but we will track it
  totalAttempts: number;
  correctCount: number;
  incorrectCount: number;
  accuracyPercentage: number;
  opsPerSecond: number;
}

export interface OperationStats {
  totalAttempts: number;
  correctCount: number;
  incorrectCount: number;
  lastLevel: DifficultyLevel;
  // We could add speed tracking here too if needed
}

export interface MathGameStats {
  sum: OperationStats;
  sub: OperationStats;
  mul: OperationStats;
  div: OperationStats;
  mixed: OperationStats;
}

const STORAGE_KEY = 'math_game_history';
const STATS_KEY = 'math_game_stats';

const initialStats: MathGameStats = {
  sum: { totalAttempts: 0, correctCount: 0, incorrectCount: 0, lastLevel: 'facil' },
  sub: { totalAttempts: 0, correctCount: 0, incorrectCount: 0, lastLevel: 'facil' },
  mul: { totalAttempts: 0, correctCount: 0, incorrectCount: 0, lastLevel: 'facil' },
  div: { totalAttempts: 0, correctCount: 0, incorrectCount: 0, lastLevel: 'facil' },
  mixed: { totalAttempts: 0, correctCount: 0, incorrectCount: 0, lastLevel: 'facil' },
};

export const saveGameSession = (session: Omit<GameSession, 'id' | 'timestamp'>) => {
  try {
    const history = getGameHistory();
    const newSession: GameSession = {
      ...session,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    
    // Add to beginning of array
    history.unshift(newSession);
    
    // Limit history size (e.g., keep last 100 games)
    if (history.length > 100) {
      history.pop();
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return newSession;
  } catch (error) {
    console.error('Failed to save game session:', error);
    return null;
  }
};

export const getGameHistory = (): GameSession[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to retrieve game history:', error);
    return [];
  }
};

export const getSmartStats = (): MathGameStats => {
  try {
    const stored = localStorage.getItem(STATS_KEY);
    if (!stored) return initialStats;
    return { ...initialStats, ...JSON.parse(stored) }; // Merge to ensure all keys exist
  } catch (error) {
    console.error('Failed to retrieve smart stats:', error);
    return initialStats;
  }
};

export const updateSmartStats = (newStats: Partial<MathGameStats>) => {
  try {
    const current = getSmartStats();
    const updated = { ...current };

    // Merge updates
    (Object.keys(newStats) as OperationType[]).forEach((op) => {
      if (newStats[op]) {
        updated[op] = {
          ...updated[op],
          ...newStats[op]!,
          // Accumulate counts
          totalAttempts: updated[op].totalAttempts + (newStats[op]?.totalAttempts || 0),
          correctCount: updated[op].correctCount + (newStats[op]?.correctCount || 0),
          incorrectCount: updated[op].incorrectCount + (newStats[op]?.incorrectCount || 0),
          // Overwrite level if provided (it represents the latest level played)
          lastLevel: newStats[op]?.lastLevel || updated[op].lastLevel
        };
      }
    });

    localStorage.setItem(STATS_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to update smart stats:', error);
    return null;
  }
};
