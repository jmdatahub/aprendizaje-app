"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { es } from '@/shared/locales/es';
import { en } from '@/shared/locales/en';
import { useWeeklyTest, TestStatus, Pregunta } from '@/shared/hooks/useWeeklyTest';

// Re-export types for backwards compatibility
export type { TestStatus, Pregunta } from '@/shared/hooks/useWeeklyTest';

// Types
export type Language = 'es' | 'en';
export type ChatMode = 'integrated' | 'page';
export type DateFormat = 'classic' | 'relative';

export interface AppSettings {
  language: Language;
  chatMode: ChatMode;
  darkMode: boolean;
  dateFormat: DateFormat;
  streakGoal: number;
  yearlyGoal: number;
}

interface AppContextType {
  // Settings
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  // i18n
  t: (key: string, params?: Record<string, any>) => any;
  formatDate: (date: string | Date | number) => string;
  // Weekly Test (delegated to hook)
  testStatus: TestStatus;
  testData: Pregunta[];
  testError: string | null;
  generateWeeklyTest: (force?: boolean) => Promise<void>;
  startTest: () => void;
  resetTest: () => void;
}

// Default Settings
const DEFAULT_SETTINGS: AppSettings = {
  language: 'es',
  chatMode: 'integrated',
  darkMode: false,
  dateFormat: 'classic',
  streakGoal: 7,
  yearlyGoal: 100
};

// Helper for nested keys
const getNestedValue = (obj: any, path: string): string => {
  return path.split('.').reduce((prev, curr) => {
    return prev ? prev[curr] : null;
  }, obj) || path;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);
  
  // Use extracted hook for weekly test functionality
  const weeklyTest = useWeeklyTest();

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('app_settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error("Error loading settings", e);
      }
    }
    setMounted(true);
  }, []);

  // Persist settings and apply side effects (Dark Mode)
  useEffect(() => {
    if (!mounted) return;

    // Save to localStorage
    localStorage.setItem('app_settings', JSON.stringify(settings));

    // Apply Dark Mode
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings, mounted]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const t = (key: string, params?: Record<string, any>) => {
    const dict = settings.language === 'es' ? es : en;
    let value = getNestedValue(dict, key);
    
    // Fallback to English if translation is missing (value equals key)
    if (value === key && settings.language !== 'en') {
      value = getNestedValue(en, key);
    }
    
    if (typeof value === 'string' && params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        if (paramKey !== 'returnObjects') {
          value = value.replace(`{${paramKey}}`, String(paramValue));
        }
      });
    }
    
    return value;
  };

  const formatDate = (date: string | Date | number) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    if (settings.dateFormat === 'relative') {
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor(diff / (1000 * 60));

      if (days > 30) return d.toLocaleDateString(settings.language === 'es' ? 'es-ES' : 'en-US');
      if (days > 1) return settings.language === 'es' ? `hace ${days} días` : `${days} days ago`;
      if (days === 1) return settings.language === 'es' ? 'ayer' : 'yesterday';
      if (hours > 1) return settings.language === 'es' ? `hace ${hours} horas` : `${hours} hours ago`;
      if (minutes > 1) return settings.language === 'es' ? `hace ${minutes} minutos` : `${minutes} minutes ago`;
      return settings.language === 'es' ? 'hace un momento' : 'just now';
    }

    return d.toLocaleDateString(settings.language === 'es' ? 'es-ES' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <AppContext.Provider value={{ 
      settings, 
      updateSettings, 
      t, 
      formatDate, 
      // Spread weekly test values
      testStatus: weeklyTest.testStatus,
      testData: weeklyTest.testData,
      testError: weeklyTest.testError,
      generateWeeklyTest: weeklyTest.generateWeeklyTest,
      startTest: weeklyTest.startTest,
      resetTest: weeklyTest.resetTest
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
