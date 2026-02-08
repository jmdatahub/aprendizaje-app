/**
 * Utility to calculate learning streaks and progress based on dates.
 */

export interface GamificationStats {
  currentStreak: number;
  uniqueDaysThisYear: number;
  isTodayLearned: boolean;
}

/**
 * Calculates stats from a list of ISO date strings or Date objects.
 */
export function calculateGamificationStats(dates: (string | Date)[]): GamificationStats {
  if (!dates || dates.length === 0) {
    return { currentStreak: 0, uniqueDaysThisYear: 0, isTodayLearned: false };
  }

  // Normalize dates to local date strings (YYYY-MM-DD) to compare unique days
  const uniqueDatesSet = new Set<string>();
  const currentYear = new Date().getFullYear();
  
  dates.forEach(d => {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return;
    
    const dateStr = dateObj.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    uniqueDatesSet.add(dateStr);
  });

  const sortedUniqueDates = Array.from(uniqueDatesSet).sort((a, b) => b.localeCompare(a)); // Descending
  
  const todayStr = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA');

  const isTodayLearned = uniqueDatesSet.has(todayStr);
  const isYesterdayLearned = uniqueDatesSet.has(yesterdayStr);

  let currentStreak = 0;
  
  // A streak is active if today OR yesterday was a learning day
  if (isTodayLearned || isYesterdayLearned) {
    let checkDate = isTodayLearned ? new Date() : yesterday;
    
    while (true) {
      const checkStr = checkDate.toLocaleDateString('en-CA');
      if (uniqueDatesSet.has(checkStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Count unique days in current year
  let uniqueDaysThisYear = 0;
  uniqueDatesSet.forEach(dateStr => {
    if (dateStr.startsWith(String(currentYear))) {
      uniqueDaysThisYear++;
    }
  });

  return {
    currentStreak,
    uniqueDaysThisYear,
    isTodayLearned
  };
}
