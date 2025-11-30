"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { es } from '@/shared/locales/es';
import { en } from '@/shared/locales/en';

type Language = 'es' | 'en';
type Translations = typeof es;

// Helper to access nested keys like "home.title"
const getNestedValue = (obj: any, path: string): string => {
  return path.split('.').reduce((prev, curr) => {
    return prev ? prev[curr] : null;
  }, obj) || path;
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('es');
  const [mounted, setMounted] = useState(false);

  // Load language from localStorage on mount
  useEffect(() => {
    const storedSettings = localStorage.getItem('app_settings');
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        if (parsed.language && (parsed.language === 'es' || parsed.language === 'en')) {
          setLanguage(parsed.language);
        }
      } catch (e) {
        console.error("Error loading language", e);
      }
    }
    setMounted(true);
  }, []);

  // Update localStorage when language changes
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    
    // Update existing settings in localStorage
    const storedSettings = localStorage.getItem('app_settings');
    let newSettings = { language: lang, chatMode: 'integrated', darkMode: false }; // Default fallback
    
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        newSettings = { ...parsed, language: lang };
      } catch (e) {}
    }
    
    localStorage.setItem('app_settings', JSON.stringify(newSettings));
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    const dict = language === 'es' ? es : en;
    let text = getNestedValue(dict, key);
    
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(`{${paramKey}}`, String(paramValue));
      });
    }
    
    return text;
  };

  // Prevent hydration mismatch by rendering children only after mount, 
  // or render with default 'es' but be aware of potential flash.
  // For simplicity in this app, we'll render immediately but effects will sync.
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function useT() {
  const { t } = useLanguage();
  return t;
}
