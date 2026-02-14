"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { APP_VERSION } from "@/shared/constants/version"
import { Button } from "@/components/ui/button"
import { Timer } from "lucide-react"
import { playClick } from "@/shared/utils/sounds"
import { SettingsModal } from "@/components/SettingsModal"
import { useApp } from "@/shared/contexts/AppContext"
import { TestPreparationOverlay } from "@/features/test-semanal/components/TestPreparationOverlay"
import { UnlockModal } from "@/features/sectores/components/UnlockModal"
import { SectorWithProgress } from "@/features/sectores/types"
import { SECTORES_DATA } from "@/shared/constants/sectores"
import { calculateGamificationStats, GamificationStats } from "@/shared/utils/gamification"
import { LearningStreak } from "@/features/stats/components/LearningStreak"
import { ChevronDown } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const { t, testStatus, testError, generateWeeklyTest } = useApp()
  
  // Settings UI state (modal visibility only)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Rotating headline
  const headlines = [
    "Pregúntame lo que quieras y yo te lo enseño",
    "Tu tutor personal disponible 24/7",
    "Aprende cualquier tema a tu ritmo",
    "Convierte tu curiosidad en conocimiento",
    "Descubre algo nuevo cada día",
    "El conocimiento está a una pregunta de distancia"
  ]
  const [headlineIndex, setHeadlineIndex] = useState(0)
  const [fadeIn, setFadeIn] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false)
      setTimeout(() => {
        setHeadlineIndex((prev) => (prev + 1) % headlines.length)
        setFadeIn(true)
      }, 300)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const [showTestOverlay, setShowTestOverlay] = useState(false)
  const [selectedLockedSector, setSelectedLockedSector] = useState<SectorWithProgress | null>(null)
  const [pendingItems, setPendingItems] = useState<any[]>([])
  const [sectorCounts, setSectorCounts] = useState<Record<string, number>>({})
  const [stats, setStats] = useState<GamificationStats>({ currentStreak: 0, uniqueDaysThisYear: 0, isTodayLearned: false })

  const handleTestSemanal = () => {
    playClick()
    
    if (testStatus === 'idle') {
      setShowTestOverlay(true)
      generateWeeklyTest(true)
    } else if (testStatus === 'generating') {
      setShowTestOverlay(true)
    } else if (testStatus === 'ready' || testStatus === 'in_progress') {
      router.push('/repaso')
    }
  }

  // Close overlay when ready and navigate
  useEffect(() => {
    if (testStatus === 'ready' && showTestOverlay) {
        setShowTestOverlay(false)
        router.push('/repaso')
    }
  }, [testStatus, showTestOverlay, router])

  useEffect(() => {
    const counts: Record<string, number> = {};
    const allPending: any[] = [];
    const decayedIds = JSON.parse(localStorage.getItem('decayed_items') || '[]');

    SECTORES_DATA.forEach((sector: any) => {
      try {
        const key = `sector_data_${sector.id}`;
        const stored = localStorage.getItem(key);

        if (stored) {
          const data = JSON.parse(stored);
          const sectorItems = data.items || [];
          counts[sector.id] = sectorItems.length;

          if (decayedIds.length > 0) {
            const sectorPending = sectorItems.filter((item: any) => decayedIds.includes(item.id));
            if (sectorPending.length > 0) {
              allPending.push(...sectorPending.map((item: any) => ({ 
                ...item, 
                sectorName: t(`sectors.${sector.key}`),
                sectorIcon: sector.icono
              })));
            }
          }
        } else {
          counts[sector.id] = 0;
        }
      } catch (e) {
        console.error("Error loading sector counts", e);
        counts[sector.id] = 0;
      }
    });
    setSectorCounts(counts);
    setPendingItems(allPending);
  }, [t]);

  // Fetch all aprendizajes for stats calculation
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/aprendizajes')
        const json = await res.json()
        if (json.success && json.data?.items && Array.isArray(json.data.items)) {
          const dates = json.data.items.map((a: any) => a.created_at)
          const calcStats = calculateGamificationStats(dates)
          setStats(calcStats)
        }
      } catch (err) {
        console.error("Error fetching stats data:", err)
      }
    }
    fetchStats()
  }, []);

  const handleEmpezarAprender = () => {
    playClick()
    router.push('/aprender')
  }

  const handleFocusTimer = () => {
    playClick()
    router.push('/focus-timer')
  }

  // Mobile specific state
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (showMobileMenu) {
      const handleGlobalClick = () => setShowMobileMenu(false)
      document.addEventListener('click', handleGlobalClick)
      return () => document.removeEventListener('click', handleGlobalClick)
    }
  }, [showMobileMenu])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center pt-24 p-8 relative transition-colors duration-500">
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Top Right Controls */}
      <div className="fixed top-4 right-4 flex items-center gap-3 z-50">
        <Link
          href="/repaso/historial"
          onClick={() => playClick()}
          className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition-all"
          title="Ver historial"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </Link>

        <button
          onClick={() => {
            playClick()
            setIsSettingsOpen(true)
          }}
          className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition-all"
          title={t('settings.title')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <div className="text-muted-foreground/50 text-[10px] select-none">
          {APP_VERSION}
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full animate-in fade-in zoom-in duration-700">
        
        {/* =========================================
            DESKTOP VIEW (hidden on mobile)
            DO NOT EDIT THIS SECTION FOR MOBILE CHANGES
           ========================================= */}
        <div className="hidden md:flex flex-col items-center gap-6 max-w-4xl mx-auto">
            {/* 1. Bloque Principal */}
            <div className="text-center space-y-8 w-full">
              <div className="h-24 md:h-32 flex items-center justify-center">
                <h1 
                  className={`text-4xl md:text-5xl font-bold text-foreground tracking-tight text-balance transition-all duration-700 ease-in-out ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                >
                  {headlines[headlineIndex]}
                </h1>
              </div>
              
              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={handleEmpezarAprender}
                  size="lg"
                  className="text-xl px-10 py-7 rounded-full shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 hover:shadow-2xl"
                >
                  {t('home.start_button')}
                </Button>
                <button
                  onClick={handleFocusTimer}
                  className="flex items-center gap-2 px-6 py-4 rounded-full text-sm font-medium bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 transition-all hover:scale-105 backdrop-blur-sm shadow-lg shadow-indigo-500/10"
                >
                  <Timer className="w-4 h-4" />
                  Focus Timer
                </button>
              </div>
            </div>

            {/* 2. Accesos Rápidos */}
            <div className="flex flex-wrap justify-center gap-3 w-full max-w-4xl">
              {/* Mi Progreso */}
              <div className="relative group">
                <button 
                  onClick={() => playClick()}
                  className="px-4 py-2 bg-card hover:bg-accent rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border border-border shadow-sm flex items-center gap-2"
                >
                  📚 Mi Progreso
                  {pendingItems.length > 0 && (
                    <span className="flex items-center gap-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
                      ⚠️ {pendingItems.length}
                    </span>
                  )}
                  <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown menu */}
                <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
                    <Link 
                      href={pendingItems.length > 0 ? "/aprendizajes?pending=true" : "/aprendizajes"} 
                      onClick={() => playClick()}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
                    >
                      <span className="text-lg">📖</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">Aprendizajes</p>
                        <p className="text-xs text-muted-foreground">Conocimientos teóricos</p>
                      </div>
                      {pendingItems.length > 0 && (
                        <span className="ml-auto text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
                          {pendingItems.length}
                        </span>
                      )}
                    </Link>
                    <div className="border-t border-border" />
                    <Link 
                      href="/habilidades" 
                      onClick={() => playClick()}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
                    >
                      <span className="text-lg">⚡</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">Habilidades</p>
                        <p className="text-xs text-muted-foreground">Tu árbol de skills</p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
              
              <div onClick={handleTestSemanal} className="cursor-pointer relative group">
                <div className={`px-4 py-2 rounded-full text-sm font-medium transition-all border shadow-sm flex items-center gap-2
                  ${testStatus === 'ready' 
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200 animate-pulse hover:bg-indigo-200' 
                    : testStatus === 'in_progress'
                      ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                      : testStatus === 'generating'
                        ? 'bg-gray-50 text-gray-500 border-gray-200'
                        : 'bg-card hover:bg-accent text-muted-foreground hover:text-foreground border-border'
                  }
                `}>
                  {testStatus === 'ready' && <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>}
                  {testStatus === 'generating' && <span className="animate-spin h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full"></span>}
                  
                  {testStatus === 'ready' ? t('home.test_ready') : 
                  testStatus === 'in_progress' ? t('home.test_in_progress') :
                  testStatus === 'generating' ? t('home.test_generating') :
                  t('home.weekly_test')}
                </div>
              </div>

              <Link href="/juegos-matematicos" onClick={() => playClick()}>
                <div className="px-4 py-2 bg-card hover:bg-accent rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border border-border shadow-sm">
                  {t('home.math_games')}
                </div>
              </Link>

              <Link href="/rutas" onClick={() => playClick()}>
                <div className="px-4 py-2 bg-card hover:bg-accent rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border border-border shadow-sm">
                  {t('home.learning_paths')}
                </div>
              </Link>
            </div>

            {/* Pendientes */}
            {pendingItems.length > 0 && (
              <Link href="/aprendizajes?pending=true" onClick={() => playClick()} className="w-full">
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-900/40 transition-all group">
                  <div className="flex items-center gap-3">
                    <span className="text-xl animate-bounce">⚠️</span>
                    <div>
                      <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">{t('home.pending_reviews')}</h3>
                      <p className="text-[10px] text-amber-600 dark:text-amber-500">Tienes {pendingItems.length} temas para repasar</p>
                    </div>
                  </div>
                  <span className="text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            )}

            {/* Streak */}
            <div className="w-full max-w-4xl animate-in slide-in-from-bottom-4 duration-1000">
              <LearningStreak streak={stats.currentStreak} yearlyCount={stats.uniqueDaysThisYear} />
            </div>

            {/* Grid */}
            <div className="mt-4 w-full">
              <p className="text-center text-xs text-muted-foreground mb-4 uppercase tracking-widest">{t('home.explore_by_topic')}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {SECTORES_DATA.map((sector: any) => {
                  const count = sectorCounts[sector.id] || 0;
                  const isLocked = count === 0;
                  const sectorName = t(`sectors.${sector.key}`);

                  return (
                    <Link 
                      key={sector.id} 
                      href={isLocked ? '#' : `/aprendizajes/${sector.id}`}
                      onClick={(e) => {
                        if (isLocked) {
                          e.preventDefault();
                          playClick();
                          setSelectedLockedSector({ ...sector, unlocked: false, nombre: sectorName } as SectorWithProgress);
                        } else {
                          playClick();
                        }
                      }}
                    >
                      <div className={`p-3 rounded-xl transition-all flex items-center gap-3 cursor-pointer group relative overflow-hidden border border-transparent ${isLocked ? 'bg-muted/50 opacity-80' : 'hover:bg-accent hover:border-border'}`}>
                        <span className={`text-xl transition-transform ${isLocked ? 'grayscale opacity-50' : 'group-hover:scale-110'}`}>
                          {sector.icono}
                        </span>
                        <span className={`text-xs font-medium ${isLocked ? 'text-muted-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                          {sectorName}
                        </span>
                        
                        {isLocked && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
        </div>

        {/* =========================================
            MOBILE VIEW (visible only on mobile)
            EDIT THIS SECTION FREELY
            ========================================= */}
        <div className="flex md:hidden flex-col items-center gap-6 w-full relative">
             {/* 1. Bloque Principal Mobile */}
            <div className="text-center space-y-6 w-full">
              <div className="h-20 flex items-center justify-center">
                <h1 
                  className={`text-3xl font-bold text-foreground tracking-tight text-balance transition-all duration-700 ease-in-out ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                >
                  {headlines[headlineIndex]}
                </h1>
              </div>
              
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={handleEmpezarAprender}
                  size="lg"
                  className="text-lg px-8 py-6 rounded-full shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95"
                >
                  {t('home.start_button')}
                </Button>
                <button
                  onClick={handleFocusTimer}
                  className="flex items-center gap-2 px-4 py-3 rounded-full text-xs font-medium bg-indigo-600/10 active:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 transition-all active:scale-95 backdrop-blur-sm"
                >
                  <Timer className="w-4 h-4" />
                  Focus
                </button>
              </div>
            </div>

            {/* 2. Accesos Rápidos Mobile */}
            <div className="flex flex-wrap justify-center gap-2 w-full relative z-20">
              {/* Mi Progreso (Mobile Menu) */}
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation() // Prevent immediate close
                    playClick()
                    setShowMobileMenu(!showMobileMenu)
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-colors border shadow-sm flex items-center gap-2 ${showMobileMenu ? 'bg-accent text-foreground border-slate-500' : 'bg-card text-muted-foreground border-border'}`}
                >
                  📚 Mi Progreso
                  {pendingItems.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-full">
                      ⚠️ {pendingItems.length}
                    </span>
                  )}
                  <ChevronDown className={`w-3 h-3 transition-transform ${showMobileMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Mobile Dropdown Overlay */}
                {showMobileMenu && (
                  <div className="absolute top-full mt-2 left-0 w-48 bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                    <Link 
                        href={pendingItems.length > 0 ? "/aprendizajes?pending=true" : "/aprendizajes"} 
                        onClick={() => playClick()}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50"
                      >
                        <span className="text-lg">📖</span>
                        <div className="text-left">
                          <p className="text-xs font-bold text-foreground">Aprendizajes</p>
                          <p className="text-[10px] text-muted-foreground">Tus notas</p>
                        </div>
                        {pendingItems.length > 0 && (
                          <span className="ml-auto text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-full">
                            {pendingItems.length}
                          </span>
                        )}
                    </Link>
                    <Link 
                        href="/habilidades" 
                        onClick={() => playClick()}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-lg">⚡</span>
                        <div className="text-left">
                          <p className="text-xs font-bold text-foreground">Habilidades</p>
                          <p className="text-[10px] text-muted-foreground">Tu árbol de skills</p>
                        </div>
                    </Link>
                  </div>
                )}
              </div>
              
              <div onClick={handleTestSemanal} className="cursor-pointer">
                <div className={`px-4 py-2 rounded-full text-xs font-medium transition-all border shadow-sm flex items-center gap-2
                  ${testStatus === 'ready' 
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200 animate-pulse' 
                    : 'bg-card text-muted-foreground border-border'
                  }
                `}>
                   <span>⚡</span> {t('home.weekly_test')}
                </div>
              </div>

              <Link href="/juegos-matematicos" onClick={() => playClick()}>
                <div className="px-4 py-2 bg-card active:bg-accent rounded-full text-xs font-medium text-muted-foreground active:text-foreground transition-colors border border-border shadow-sm">
                  {t('home.math_games')}
                </div>
              </Link>

              <Link href="/rutas" onClick={() => playClick()}>
                <div className="px-4 py-2 bg-card active:bg-accent rounded-full text-xs font-medium text-muted-foreground active:text-foreground transition-colors border border-border shadow-sm">
                  {t('home.learning_paths')}
                </div>
              </Link>
            </div>

            {/* Pendientes */}
            {pendingItems.length > 0 && (
              <Link href="/aprendizajes?pending=true" onClick={() => playClick()} className="w-full">
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 active:bg-amber-100 dark:active:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-900/40 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-xl animate-bounce">⚠️</span>
                    <div>
                      <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">{t('home.pending_reviews')}</h3>
                      <p className="text-[10px] text-amber-600 dark:text-amber-500">{pendingItems.length} temas</p>
                    </div>
                  </div>
                  <span className="text-amber-600 dark:text-amber-400">→</span>
                </div>
              </Link>
            )}

            {/* Streak */}
            <div className="w-full animate-in slide-in-from-bottom-4 duration-1000">
              <LearningStreak streak={stats.currentStreak} yearlyCount={stats.uniqueDaysThisYear} />
            </div>

            {/* Grid */}
            <div className="mt-4 w-full">
              <p className="text-center text-xs text-muted-foreground mb-4 uppercase tracking-widest">{t('home.explore_by_topic')}</p>
              <div className="grid grid-cols-2 gap-2">
                {SECTORES_DATA.map((sector: any) => {
                  const count = sectorCounts[sector.id] || 0;
                  const isLocked = count === 0;
                  const sectorName = t(`sectors.${sector.key}`);

                  return (
                    <Link 
                      key={sector.id} 
                      href={isLocked ? '#' : `/aprendizajes/${sector.id}`}
                      onClick={(e) => {
                        if (isLocked) {
                          e.preventDefault();
                          playClick();
                          setSelectedLockedSector({ ...sector, unlocked: false, nombre: sectorName } as SectorWithProgress);
                        } else {
                          playClick();
                        }
                      }}
                    >
                      <div className={`p-3 rounded-xl transition-all flex items-center gap-3 cursor-pointer relative overflow-hidden border border-transparent ${isLocked ? 'bg-muted/50 opacity-80' : 'bg-card border-border'}`}>
                        <span className={`text-xl ${isLocked ? 'grayscale opacity-50' : ''}`}>
                          {sector.icono}
                        </span>
                        <span className={`text-xs font-medium ${isLocked ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {sectorName}
                        </span>
                        
                        {isLocked && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
        </div>
      </main>

      <TestPreparationOverlay 
        isOpen={showTestOverlay}
        status={testStatus} 
        error={testError}
        onRetry={() => generateWeeklyTest(true)}
        onClose={() => setShowTestOverlay(false)}
      />

      <UnlockModal 
        sector={selectedLockedSector} 
        onClose={() => setSelectedLockedSector(null)} 
      />
    </div>
  )
}
