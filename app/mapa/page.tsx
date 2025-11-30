"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ErrorBoundary } from "@/shared/components"
import { SectoresGrid, UnlockModal, SectorWithProgress } from "@/features/sectores"
import { APP_VERSION } from "@/shared/constants/version"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { playClick } from "@/shared/utils/sounds"

import { SettingsModal } from "@/components/SettingsModal"
import { useApp } from "@/shared/contexts/AppContext"
import { LearningPathsBlock } from "@/features/learning-paths/components/LearningPathsBlock"

const SECTORES_NOMBRES = [
  'Salud y Rendimiento', 'Ciencias Naturales', 'Ciencias Fisicas', 
  'Matematicas y Logica', 'Tecnologia y Computacion', 'Historia y Filosofia', 
  'Artes y Cultura', 'Economia y Negocios', 'Sociedad y Psicologia'
];

export default function Mapa() {
  const router = useRouter()
  const { t, settings, testStatus, generateWeeklyTest } = useApp()
  
  // Modal state
  const [selectedSector, setSelectedSector] = useState<SectorWithProgress | null>(null)
  
  // Settings UI state (modal visibility only)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Chat Overlay state

  
  // Repaso mensual state
  const [repasoRequired, setRepasoRequired] = useState(false)
  const [repasoDone, setRepasoDone] = useState(false)
  const [daysToNextRepaso, setDaysToNextRepaso] = useState(0)

  // Pending reviews state
  const [pendingItems, setPendingItems] = useState<any[]>([])
  const [sectorAlerts, setSectorAlerts] = useState<Record<string, number>>({})
  const [showPendingReviews, setShowPendingReviews] = useState(false)

  // Calculate status on mount
  useEffect(() => {
    try {
      // Repaso Mensual Logic
      const now = new Date()
      const day = now.getDate()
      const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
      const key = `repaso_done_${ym}`
      const done = localStorage.getItem(key) === '1'
      setRepasoDone(done)
      
      const next = new Date(now)
      next.setMonth(now.getMonth() + 1)
      next.setDate(1)
      const ms = next.getTime() - now.getTime()
      const days = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
      setDaysToNextRepaso(days)
      setRepasoRequired(day === 1 && !done)

      // Pending Reviews Logic
      const decayedIds = JSON.parse(localStorage.getItem('decayed_items') || '[]');
      const newPendingItems: any[] = [];
      const newAlerts: Record<string, number> = {};

      if (decayedIds.length > 0) {
        SECTORES_NOMBRES.forEach(nombre => {
          try {
            const sectorKey = `sector_data_${nombre.toLowerCase()}`;
            const stored = localStorage.getItem(sectorKey);
            if (stored) {
              const data = JSON.parse(stored);
              if (data && Array.isArray(data.items)) {
                const sectorPending = data.items.filter((item: any) => decayedIds.includes(item.id));
                if (sectorPending.length > 0) {
                  newAlerts[nombre.toLowerCase()] = sectorPending.length;
                  newPendingItems.push(...sectorPending.map((item: any) => ({ ...item, sectorName: nombre })));
                }
              }
            }
          } catch {}
        });
      }
      setPendingItems(newPendingItems);
      setSectorAlerts(newAlerts);

    } catch (error) {
      console.error('Error calculating status:', error)
    }
  }, [])

  const handleEmpezarAprender = () => {
    playClick()
    if (repasoRequired) {
      router.push('/repaso')
    } else {
      router.push('/aprender')
    }
  }

  // Test Semanal logic
  const [countdown, setCountdown] = useState(0)
  const [hasStartedGeneration, setHasStartedGeneration] = useState(false)

  // Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleTestSemanalClick = () => {
    playClick()
    
    // If ready, navigate immediately
    if (testStatus === 'ready') {
      router.push('/repaso');
      return;
    }

    // If idle, start generation and countdown
    if (testStatus === 'idle') {
      setHasStartedGeneration(true);
      generateWeeklyTest();
      setCountdown(10);
    }
  }

  // Determine button state for UI
  const getButtonState = () => {
    if (testStatus === 'ready') return 'ready';
    if (countdown > 0) return 'countdown';
    if (testStatus === 'generating') return 'generating';
    // If we started generation, countdown finished, but status is idle -> Error or finished empty
    if (hasStartedGeneration && testStatus === 'idle' && countdown === 0) return 'error';
    return 'idle';
  }

  const buttonState = getButtonState();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 relative dark:from-slate-900 dark:to-slate-800 transition-colors duration-500">
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />



      {/* Top Right Controls */}
      <div className="fixed top-2 right-2 flex items-center gap-2 z-50">
        {/* Settings Button */}
        <button
          onClick={() => {
            playClick()
            setIsSettingsOpen(true)
          }}
          className="bg-white/80 backdrop-blur-sm text-gray-700 hover:text-gray-900 p-1.5 rounded-full shadow-sm hover:bg-white transition-all hover:rotate-90 duration-500"
          title={t('settings.title')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Version badge */}
        <div className="bg-gray-100/80 backdrop-blur-sm text-gray-700 text-[10px] px-2 py-1.5 rounded shadow-sm select-none">
          {APP_VERSION}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-5xl font-bold text-gray-800 mb-2 dark:text-white transition-colors">{t('home.title')}</h1>
          <p className="text-xl text-gray-600 mb-6 dark:text-gray-300 transition-colors">
            {t('home.subtitle')}
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleEmpezarAprender}
              variant={repasoRequired ? "secondary" : "default"}
              size="lg"
              className={repasoRequired ? "cursor-pointer" : ""}
              title={repasoRequired ? t('home.training_day') : ''}
              disabled={buttonState === 'countdown' || buttonState === 'generating'}
            >
              {t('home.start_button')}
            </Button>

            <ErrorBoundary>
              <Button 
                variant={buttonState === 'ready' ? "default" : "outline"} 
                size="lg"
                onClick={handleTestSemanalClick}
                disabled={buttonState === 'countdown' || buttonState === 'generating'}
                className={`transition-all duration-500 relative overflow-hidden ${
                  buttonState === 'generating'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 w-56' 
                    : buttonState === 'ready'
                      ? 'bg-green-600 hover:bg-green-700 text-white border-green-600 w-56 shadow-lg hover:shadow-green-200'
                      : buttonState === 'countdown'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 w-56'
                        : buttonState === 'error'
                          ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
                          : 'hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                {/* Content based on state */}
                {buttonState === 'countdown' && (
                  <>
                    <span className="relative z-10 flex items-center gap-2 font-medium">
                      <span className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full"></span>
                      {t('home.generating_test', { seconds: countdown })}
                    </span>
                    <div 
                      className="absolute bottom-0 left-0 h-1 bg-indigo-400 transition-all duration-1000 ease-linear"
                      style={{ width: `${(countdown / 10) * 100}%` }}
                    />
                  </>
                )}

                {buttonState === 'generating' && (
                  <span className="relative z-10 flex items-center gap-2 font-medium animate-pulse">
                    <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generando tu test...
                  </span>
                )}

                {buttonState === 'ready' && (
                  <span className="flex items-center gap-2 font-bold animate-in fade-in zoom-in duration-300">
                    <span className="text-xl">✨</span> 
                    Test Semanal Listo
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                )}

                {buttonState === 'error' && (
                  <span className="flex items-center gap-2">
                    <span>⚠️</span> Error. Reintentar
                  </span>
                )}

                {buttonState === 'idle' && (
                  t('home.weekly_test')
                )}
              </Button>
            </ErrorBoundary>

            <ErrorBoundary>
              <Link href="/aprendizajes" onClick={() => playClick()}>
                <Button variant="outline" size="lg">
                  {t('home.my_learnings')}
                </Button>
              </Link>
            </ErrorBoundary>
          </div>

          {/* Repaso status */}
          {repasoRequired ? (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {t('home.training_day')}
            </div>
          ) : (
            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {repasoDone
                ? t('home.training_completed')
                : t('home.days_remaining', { days: daysToNextRepaso })}
            </div>
          )}
        </header>

        {/* Learning Paths Section */}
        <ErrorBoundary>
          <LearningPathsBlock 
            onStartLearning={(topic, sector, learningId, pathId, stepId) => {
              try {
                const key = `sector_data_${sector.toLowerCase()}`;
                const stored = localStorage.getItem(key);
                if (stored) {
                  const data = JSON.parse(stored);
                  const item = data.items.find((i: any) => i.id === learningId);
                  if (item) {
                    const params = new URLSearchParams();
                    if (item.summary) params.set('tema', item.summary); // Using summary as topic/context
                    if (item.summary) params.set('continueContext', item.summary);
                    if (sector) params.set('sector', sector);
                    
                    sessionStorage.setItem('active_path_step', JSON.stringify({ pathId, stepId }));
                    router.push(`/aprender?${params.toString()}`);
                  }
                }
              } catch (e) {
                console.error("Error finding learning item", e);
              }
            }}
          />
        </ErrorBoundary>

        {/* Pending Reviews Section - Collapsible */}
        {pendingItems.length > 0 && (
          <section className="mb-12 animate-fade-in">
            <button
              onClick={() => {
                playClick()
                setShowPendingReviews(!showPendingReviews)
              }}
              className="w-full flex items-center justify-between p-4 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-800">{t('home.pending_reviews')}</h2>
                <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
                  {pendingItems.length}
                </span>
              </div>
              <svg
                className={`w-6 h-6 text-gray-600 transition-transform duration-300 ${showPendingReviews ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div
              className={`overflow-hidden transition-all duration-500 ease-in-out ${
                showPendingReviews ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
              }`}
            >
              {/* Clear All Button */}
              <div className="mb-3 flex justify-end">
                <button
                  onClick={() => {
                    if (confirm(t('home.confirm_mark_all'))) {
                      localStorage.setItem('decayed_items', JSON.stringify([]));
                      setPendingItems([]);
                      setSectorAlerts({});
                      playClick();
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('home.mark_all_completed')}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingItems.map((item, idx) => (
                  <Link
                    key={idx}
                    href={`/aprender?mode=review&tema=${encodeURIComponent(item.title)}&sector=${encodeURIComponent(item.sectorName)}&autostart=true`}
                    className="group"
                  >
                    <Card className="border-amber-200 bg-amber-50/50 hover:bg-amber-100/80 transition-all hover:shadow-md cursor-pointer">
                      <CardContent className="p-3 relative overflow-hidden">
                        {/* Worn effect overlay */}
                        <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-20 mix-blend-multiply"></div>
                        
                        <div className="relative z-10 flex items-center gap-3">
                          <div className="text-2xl shrink-0">
                            {item.sectorName === 'Salud y Rendimiento' && '🏃'}
                            {item.sectorName === 'Ciencias Naturales' && '🌿'}
                            {item.sectorName === 'Ciencias Fisicas' && '⚛️'}
                            {item.sectorName === 'Matematicas y Logica' && '🔢'}
                            {item.sectorName === 'Tecnologia y Computacion' && '💻'}
                            {item.sectorName === 'Historia y Filosofia' && '📜'}
                            {item.sectorName === 'Artes y Cultura' && '🎨'}
                            {item.sectorName === 'Economia y Negocios' && '💼'}
                            {item.sectorName === 'Sociedad y Psicologia' && '🧠'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-800 text-sm truncate group-hover:text-amber-900 transition-colors">
                              {item.title}
                            </h3>
                            <span className="text-[10px] text-amber-600 font-medium uppercase tracking-wide">
                              {item.sectorName}
                            </span>
                          </div>
                          <div className="shrink-0 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            →
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Welcome section - Compact */}
        <ErrorBoundary>
          <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 dark:from-slate-800 dark:to-slate-700 dark:border-slate-600">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="text-4xl">👋</div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2 dark:text-white">{t('home.welcome_title')}</h2>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-500">💬</span>
                      <span>{t('home.feature_ai')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-500">📊</span>
                      <span>{t('home.feature_tests')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">🗂️</span>
                      <span>{t('home.feature_sectors')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-500">📈</span>
                      <span>{t('home.feature_profile')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </ErrorBoundary>

        {/* Math Games Section */}
        <ErrorBoundary>
          <Card 
            className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 dark:from-slate-800 dark:to-slate-700 dark:border-slate-600 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
            onClick={() => {
              playClick()
              router.push('/juegos-matematicos')
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🎮</div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-800 mb-1 dark:text-white">Juegos matemáticos</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Practica cálculo, problemas y retos de lógica.
                  </p>
                </div>
                <div className="text-gray-400 dark:text-gray-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </ErrorBoundary>

        {/* Sectores Grid with Error Boundary */}
        <ErrorBoundary
          fallback={
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-red-800">{t('home.error_sectors')}</h3>
                <p className="text-sm text-red-600 mt-1">
                  {t('home.error_sectors_desc')}
                </p>
              </CardContent>
            </Card>
          }
        >
          <SectoresGrid onUnlock={setSelectedSector} alerts={sectorAlerts} />
        </ErrorBoundary>

        {/* Unlock Modal */}
        {selectedSector && (
          <UnlockModal
            sector={selectedSector}
            onClose={() => setSelectedSector(null)}
          />
        )}
      </div>
    </div>
  )
}
