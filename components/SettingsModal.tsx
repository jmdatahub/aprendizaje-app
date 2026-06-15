"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp, AppSettings } from "@/shared/contexts/AppContext";
import { Sheet } from "@/shared/components";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t, settings, updateSettings } = useApp();
  const [showSavedToast, setShowSavedToast] = React.useState(false);
  const toastTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const handleChange = (key: keyof AppSettings, value: string | number | boolean) => {
    updateSettings({ [key]: value });
    setShowSavedToast(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setShowSavedToast(false), 2000);
  };

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title={`⚙️  ${t('settings.title')}`}
      desktopMaxWidth="max-w-md"
      footer={(
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-card border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent transition-all min-h-[40px]"
          >
            {t('settings.close')}
          </button>
        </div>
      )}
    >
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-7">

          {/* Sección: Experiencia */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.18em]">
              {t('settings.experience_section')}
            </h3>

            <div className="grid gap-3">
              <label className="text-sm font-medium text-foreground">{t('settings.chat_mode')}</label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`
                    cursor-pointer relative flex flex-col items-center justify-between rounded-xl border-2 p-4 transition-all
                    ${settings.chatMode === 'integrated'
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-border bg-card hover:bg-accent hover:border-border'}
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
                  <span className={`text-sm font-semibold ${settings.chatMode === 'integrated' ? 'text-primary' : 'text-muted-foreground'}`}>
                    {t('settings.mode_integrated')}
                  </span>
                  <span className="text-xs text-muted-foreground text-center mt-1">{t('settings.mode_integrated_desc')}</span>
                </label>

                <label
                  className={`
                    cursor-pointer relative flex flex-col items-center justify-between rounded-xl border-2 p-4 transition-all
                    ${settings.chatMode === 'page'
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-border bg-card hover:bg-accent hover:border-border'}
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
                  <span className={`text-sm font-semibold ${settings.chatMode === 'page' ? 'text-primary' : 'text-muted-foreground'}`}>
                    {t('settings.mode_page')}
                  </span>
                  <span className="text-xs text-muted-foreground text-center mt-1">{t('settings.mode_page_desc')}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Sección: General */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.18em]">
              {t('settings.general_section')}
            </h3>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">{t('settings.language')}</label>
              <Select
                value={settings.language}
                onValueChange={(val) => handleChange('language', val)}
              >
                <SelectTrigger className="w-[140px] sm:w-[180px]">
                  <SelectValue placeholder={t('settings.select_language')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Formato de fecha</label>
              <div className="flex bg-muted rounded-lg p-1 gap-1">
                <button
                  type="button"
                  onClick={() => handleChange('dateFormat', 'classic')}
                  aria-label="Formato de fecha clásico DD/MM/YYYY"
                  aria-pressed={settings.dateFormat === 'classic'}
                  className={`px-4 h-11 sm:h-9 text-xs font-medium rounded-md transition-all active:scale-95 ${
                    settings.dateFormat === 'classic'
                      ? 'bg-card text-foreground shadow-sm border border-border/60'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  DD/MM/YYYY
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('dateFormat', 'relative')}
                  aria-label="Formato de fecha relativo (hace X días)"
                  aria-pressed={settings.dateFormat === 'relative'}
                  className={`px-4 h-11 sm:h-9 text-xs font-medium rounded-md transition-all active:scale-95 ${
                    settings.dateFormat === 'relative'
                      ? 'bg-card text-foreground shadow-sm border border-border/60'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Hace X días
                </button>
              </div>
            </div>
          </div>

          {/* Sección: Objetivos */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.18em]">
              {t('settings.objective_section')}
            </h3>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                {t('settings.streak_goal')}
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="1"
                max="365"
                value={settings.streakGoal}
                onChange={(e) => handleChange('streakGoal', parseInt(e.target.value) || 1)}
                aria-label={t('settings.streak_goal')}
                className="w-20 px-3 py-2 bg-muted border border-border rounded-lg text-base md:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all text-center"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                {t('settings.yearly_goal')}
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="1"
                max="365"
                value={settings.yearlyGoal}
                onChange={(e) => handleChange('yearlyGoal', parseInt(e.target.value) || 1)}
                aria-label={t('settings.yearly_goal')}
                className="w-20 px-3 py-2 bg-muted border border-border rounded-lg text-base md:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all text-center"
              />
            </div>
          </div>

          {/* Sección: Apariencia */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.18em]">
              {t('settings.appearance_section')}
            </h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label htmlFor="dark-mode" className="text-sm font-medium text-foreground">{t('settings.dark_mode')}</label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.dark_mode_desc')}
                </p>
              </div>

              {/* Custom Switch */}
              <button
                type="button"
                id="dark-mode"
                onClick={() => handleChange('darkMode', !settings.darkMode)}
                role="switch"
                aria-checked={settings.darkMode}
                aria-label={settings.darkMode ? 'Desactivar modo oscuro' : 'Activar modo oscuro'}
                className={`
                  relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95 shrink-0
                  ${settings.darkMode ? 'bg-primary' : 'bg-muted-foreground/30'}
                `}
              >
                <span
                  className={`
                    inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform
                    ${settings.darkMode ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
          </div>

      </div>

      {/* Toast de confirmación al guardar ajustes */}
      <AnimatePresence>
        {showSavedToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            role="status"
            aria-live="polite"
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-[60] pointer-events-none"
          >
            <span aria-hidden="true">✅</span>
            <span className="text-sm font-medium">Ajustes guardados</span>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}
