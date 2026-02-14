"use client";

import Link from "next/link";
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
    <Link href="/progreso" className="relative group flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 py-3 px-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-gray-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors cursor-pointer text-decoration-none">
      <div className="flex flex-wrap justify-center gap-6">
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
      
      {/* Botón Ver Más Visual - Integrado al final */}
      <div className="w-full md:w-auto text-center mt-2 md:mt-0 md:border-l md:pl-4 md:border-gray-200 dark:md:border-slate-700">
        <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors font-medium flex items-center justify-center gap-1">
          Ver más <span className="transform group-hover:translate-x-0.5 transition-transform">→</span>
        </span>
      </div>
    </Link>
  );
}
