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
