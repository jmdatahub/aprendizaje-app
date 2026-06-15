import { OperationType, DifficultyLevel } from '../utils/mathGameUtils';

export type GameMode = 'timed' | 'free' | 'smart';

// ============================================
// Player Profiles
// ============================================

export interface PlayerProfile {
  id: string;
  name: string;
  emoji: string;
  createdAt: number;
}

const PROFILES_KEY = 'math_game_profiles';
const ACTIVE_PROFILE_KEY = 'math_game_active_profile';

const DEFAULT_PROFILES: PlayerProfile[] = [
  { id: 'serio', name: 'En serio', emoji: '🎯', createdAt: 0 },
  { id: 'casual', name: 'Por diversión', emoji: '🎮', createdAt: 0 },
];

export const getProfiles = (): PlayerProfile[] => {
  try {
    const stored = localStorage.getItem(PROFILES_KEY);
    if (!stored) {
      // Initialize with defaults
      localStorage.setItem(PROFILES_KEY, JSON.stringify(DEFAULT_PROFILES));
      return DEFAULT_PROFILES;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to get profiles:', error);
    return DEFAULT_PROFILES;
  }
};

export const createProfile = (name: string, emoji: string = '👤'): PlayerProfile => {
  const profiles = getProfiles();
  const newProfile: PlayerProfile = {
    id: crypto.randomUUID(),
    name,
    emoji,
    createdAt: Date.now(),
  };
  profiles.push(newProfile);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  return newProfile;
};

export const deleteProfile = (profileId: string): boolean => {
  const profiles = getProfiles();
  // Don't allow deleting default profiles
  if (profileId === 'serio' || profileId === 'casual') return false;
  
  const filtered = profiles.filter(p => p.id !== profileId);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(filtered));
  
  // Clear active profile if deleted
  if (getActiveProfileId() === profileId) {
    setActiveProfile('serio');
  }
  return true;
};

export const getActiveProfileId = (): string => {
  try {
    return localStorage.getItem(ACTIVE_PROFILE_KEY) || 'serio';
  } catch {
    return 'serio';
  }
};

export const getActiveProfile = (): PlayerProfile | undefined => {
  const profiles = getProfiles();
  const activeId = getActiveProfileId();
  return profiles.find(p => p.id === activeId);
};

export const setActiveProfile = (profileId: string): void => {
  localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
};

// ============================================
// Game Sessions (updated with profile support)
// ============================================

export interface GameSession {
  id: string;
  timestamp: number;
  profileId: string; // NEW: links to player profile
  mode: GameMode;
  operation: OperationType;
  level: DifficultyLevel;
  durationSeconds: number | null;
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
const OP_STATS_KEY = 'math_game_op_stats';

const initialStats: MathGameStats = {
  sum: { totalAttempts: 0, correctCount: 0, incorrectCount: 0, lastLevel: 'facil' },
  sub: { totalAttempts: 0, correctCount: 0, incorrectCount: 0, lastLevel: 'facil' },
  mul: { totalAttempts: 0, correctCount: 0, incorrectCount: 0, lastLevel: 'facil' },
  div: { totalAttempts: 0, correctCount: 0, incorrectCount: 0, lastLevel: 'facil' },
  mixed: { totalAttempts: 0, correctCount: 0, incorrectCount: 0, lastLevel: 'facil' },
};

export const saveGameSession = (session: Omit<GameSession, 'id' | 'timestamp' | 'profileId'>) => {
  try {
    const history = getGameHistory();
    const newSession: GameSession = {
      ...session,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      profileId: getActiveProfileId(), // Automatically uses active profile
    };
    
    history.unshift(newSession);
    
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

export const getGameHistory = (profileId?: string): GameSession[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const allSessions: GameSession[] = JSON.parse(stored);
    
    // If profileId is provided, filter by it
    if (profileId) {
      return allSessions.filter(s => s.profileId === profileId);
    }
    
    return allSessions;
  } catch (error) {
    console.error('Failed to retrieve game history:', error);
    return [];
  }
};

// Stats are now per-profile
const getStatsKey = (profileId: string) => `${STATS_KEY}_${profileId}`;

export const getSmartStats = (profileId?: string): MathGameStats => {
  const pid = profileId || getActiveProfileId();
  try {
    const stored = localStorage.getItem(getStatsKey(pid));
    if (!stored) return initialStats;
    return { ...initialStats, ...JSON.parse(stored) };
  } catch (error) {
    console.error('Failed to retrieve smart stats:', error);
    return initialStats;
  }
};

export const updateSmartStats = (newStats: Partial<MathGameStats>, profileId?: string) => {
  const pid = profileId || getActiveProfileId();
  try {
    const current = getSmartStats(pid);
    const updated = { ...current };

    (Object.keys(newStats) as OperationType[]).forEach((op) => {
      if (newStats[op]) {
        updated[op] = {
          ...updated[op],
          ...newStats[op]!,
          totalAttempts: updated[op].totalAttempts + (newStats[op]?.totalAttempts || 0),
          correctCount: updated[op].correctCount + (newStats[op]?.correctCount || 0),
          incorrectCount: updated[op].incorrectCount + (newStats[op]?.incorrectCount || 0),
          lastLevel: newStats[op]?.lastLevel || updated[op].lastLevel
        };
      }
    });

    localStorage.setItem(getStatsKey(pid), JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to update smart stats:', error);
    return null;
  }
};

// ============================================
// Per-operation measurement stats (NEW, additive)
// Aggregates precision (accuracy) and speed (avg time per op) by concrete
// operation type — independent of game mode. Stored under a dedicated key
// so it never interferes with smart stats or session history.
// ============================================

// Only the four concrete operations are measured; 'mixed' resolves to a
// concrete op per exercise, so it is never stored as a bucket itself.
export type ConcreteOperationType = 'sum' | 'sub' | 'mul' | 'div';

export const CONCRETE_OPERATIONS: readonly ConcreteOperationType[] = ['sum', 'sub', 'mul', 'div'];

export interface OperationAggregate {
  totalAttempts: number;
  correctCount: number;
  /** Sum of answer times in ms across all attempts; avg = totalTimeMs / totalAttempts. */
  totalTimeMs: number;
}

export type OpAggregateStats = Record<ConcreteOperationType, OperationAggregate>;

/** A single recorded answer during a game, used to build the aggregate. */
export interface OpResult {
  op: ConcreteOperationType;
  correct: boolean;
  timeMs: number;
}

const emptyOpAggregate = (): OperationAggregate => ({
  totalAttempts: 0,
  correctCount: 0,
  totalTimeMs: 0,
});

export const getEmptyOpAggregateStats = (): OpAggregateStats => ({
  sum: emptyOpAggregate(),
  sub: emptyOpAggregate(),
  mul: emptyOpAggregate(),
  div: emptyOpAggregate(),
});

const getOpStatsKey = (profileId: string) => `${OP_STATS_KEY}_${profileId}`;

// Guards against pathological values that could bloat localStorage or skew
// averages (e.g. a tab left open for hours between two answers).
const MAX_TIME_PER_OP_MS = 5 * 60 * 1000; // 5 min cap per single answer

const sanitizeAggregate = (raw: unknown): OperationAggregate => {
  const base = emptyOpAggregate();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<OperationAggregate>;
  const totalAttempts = Number.isFinite(r.totalAttempts) ? Math.max(0, Math.floor(r.totalAttempts as number)) : 0;
  const correctCount = Number.isFinite(r.correctCount) ? Math.max(0, Math.floor(r.correctCount as number)) : 0;
  const totalTimeMs = Number.isFinite(r.totalTimeMs) ? Math.max(0, r.totalTimeMs as number) : 0;
  return {
    totalAttempts,
    // correctCount can never exceed attempts
    correctCount: Math.min(correctCount, totalAttempts),
    totalTimeMs,
  };
};

export const getOpAggregateStats = (profileId?: string): OpAggregateStats => {
  const pid = profileId || getActiveProfileId();
  const empty = getEmptyOpAggregateStats();
  try {
    const stored = localStorage.getItem(getOpStatsKey(pid));
    if (!stored) return empty;
    const parsed = JSON.parse(stored) as Partial<Record<ConcreteOperationType, unknown>>;
    return {
      sum: sanitizeAggregate(parsed.sum),
      sub: sanitizeAggregate(parsed.sub),
      mul: sanitizeAggregate(parsed.mul),
      div: sanitizeAggregate(parsed.div),
    };
  } catch (error) {
    console.error('Failed to retrieve op aggregate stats:', error);
    return empty;
  }
};

/**
 * Folds a batch of per-exercise results (from one game) into the persisted
 * per-operation aggregate for the given profile. Additive: existing totals are
 * preserved and incremented. Returns the updated aggregate (or null on error).
 */
export const recordOpResults = (results: OpResult[], profileId?: string): OpAggregateStats | null => {
  const pid = profileId || getActiveProfileId();
  if (results.length === 0) return getOpAggregateStats(pid);
  try {
    const current = getOpAggregateStats(pid);
    for (const result of results) {
      if (!CONCRETE_OPERATIONS.includes(result.op)) continue;
      const bucket = current[result.op];
      const timeMs = Number.isFinite(result.timeMs)
        ? Math.min(Math.max(0, result.timeMs), MAX_TIME_PER_OP_MS)
        : 0;
      bucket.totalAttempts += 1;
      bucket.correctCount += result.correct ? 1 : 0;
      bucket.totalTimeMs += timeMs;
    }
    localStorage.setItem(getOpStatsKey(pid), JSON.stringify(current));
    return current;
  } catch (error) {
    console.error('Failed to record op results:', error);
    return null;
  }
};
