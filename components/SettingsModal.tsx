"use client";

import React, { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp, AppSettings } from "@/shared/contexts/AppContext";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const { t, settings, updateSettings } = useApp();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (!isOpen) return null;

  const handleChange = (key: keyof AppSettings, value: any) => {
    updateSettings({ [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 m-4">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <span className="text-2xl">⚙️</span> {t('settings.title')}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-8">
          
          {/* Sección: Experiencia */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t('settings.experience_section')}
            </h3>
            
            <div className="grid gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.chat_mode')}</label>
              <div className="grid grid-cols-2 gap-4">
                <label 
                  className={`
                    cursor-pointer relative flex flex-col items-center justify-between rounded-lg border-2 p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all
                    ${settings.chatMode === 'integrated' 
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'}
                  `}
                >
                  <input 
                    type="radio" 
                    name="chatMode" 
                    value="integrated" 
                    checked={settings.chatMode === 'integrated'}
                    onChange={() => handleChange('chatMode', 'integrated')}
                    className="sr-only"
                  />
                  <span className="text-2xl mb-2">🖥️</span>
                  <span className={`font-semibold ${settings.chatMode === 'integrated' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>{t('settings.mode_integrated')}</span>
                  <span className="text-xs text-gray-500 text-center mt-1">{t('settings.mode_integrated_desc')}</span>
                </label>

                <label 
                  className={`
                    cursor-pointer relative flex flex-col items-center justify-between rounded-lg border-2 p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all
                    ${settings.chatMode === 'page' 
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'}
                  `}
                >
                  <input 
                    type="radio" 
                    name="chatMode" 
                    value="page" 
                    checked={settings.chatMode === 'page'}
                    onChange={() => handleChange('chatMode', 'page')}
                    className="sr-only"
                  />
                  <span className="text-2xl mb-2">📄</span>
                  <span className={`font-semibold ${settings.chatMode === 'page' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>{t('settings.mode_page')}</span>
                  <span className="text-xs text-gray-500 text-center mt-1">{t('settings.mode_page_desc')}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Sección: General */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t('settings.general_section')}
            </h3>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.language')}</label>
              <Select 
                value={settings.language} 
                onValueChange={(val) => handleChange('language', val)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('settings.select_language')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Formato de fecha</label>
              <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                <button
                  onClick={() => handleChange('dateFormat', 'classic')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    settings.dateFormat === 'classic'
                      ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  DD/MM/YYYY
                </button>
                <button
                  onClick={() => handleChange('dateFormat', 'relative')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    settings.dateFormat === 'relative'
                      ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Hace X días
                </button>
              </div>
            </div>
          </div>

          {/* Sección: Objetivos */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t('settings.objective_section')}
            </h3>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.streak_goal')}
              </label>
              <input 
                type="number" 
                min="1"
                max="365"
                value={settings.streakGoal}
                onChange={(e) => handleChange('streakGoal', parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-1.5 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.yearly_goal')}
              </label>
              <input 
                type="number" 
                min="1"
                max="365"
                value={settings.yearlyGoal}
                onChange={(e) => handleChange('yearlyGoal', parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-1.5 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Sección: Apariencia */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t('settings.appearance_section')}
            </h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label htmlFor="dark-mode" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.dark_mode')}</label>
                <p className="text-xs text-gray-500">
                  {t('settings.dark_mode_desc')}
                </p>
              </div>
              
              {/* Custom Switch */}
              <button
                id="dark-mode"
                onClick={() => handleChange('darkMode', !settings.darkMode)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  ${settings.darkMode ? 'bg-blue-600' : 'bg-gray-200'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${settings.darkMode ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
          </div>

        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            {t('settings.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
