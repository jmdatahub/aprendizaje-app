"use client";

import React from "react";
import { useApp } from "@/shared/contexts/AppContext";

interface LearningStreakProps {
  streak: number;
  yearlyCount: number;
}

export function LearningStreak({ streak, yearlyCount }: LearningStreakProps) {
  const { t, settings } = useApp();
  
  const streakPercent = Math.min((streak / settings.streakGoal) * 100, 100);
  const yearlyPercent = Math.min((yearlyCount / settings.yearlyGoal) * 100, 100);

  return (
    <div className="flex flex-wrap justify-center gap-6 py-2 px-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-gray-100 dark:border-slate-800">
      {/* Racha Compact */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center p-1.5 rounded-lg ${streak > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-100 dark:bg-slate-800'}`}>
          <span className="text-sm">{streak > 0 ? "🔥" : "🌑"}</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{t('home.current_streak')}</span>
            <span className="text-[10px] font-black text-orange-600 dark:text-orange-400">{streak} / {settings.streakGoal}</span>
          </div>
          <div className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-none">
            {t('home.streak_days', { days: streak })}
          </div>
        </div>
      </div>

      <div className="w-px h-8 bg-gray-200 dark:bg-slate-700 hidden md:block" />

      {/* Anual Compact */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <span className="text-sm">📅</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{t('home.yearly_goal')}</span>
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">{yearlyCount} / {settings.yearlyGoal}</span>
          </div>
          <div className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-none">
            {t('home.year_progress', { current: yearlyCount, total: settings.yearlyGoal })}
          </div>
        </div>
      </div>
    </div>
  );
}
