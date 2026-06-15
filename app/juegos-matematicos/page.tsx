"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useApp } from "@/shared/contexts/AppContext"
import { 
  generateExercise, 
  OperationType, 
  DifficultyLevel, 
  MathExercise 
} from "./utils/mathGameUtils"
import { 
  saveGameSession, 
  getGameHistory, 
  getSmartStats,
  updateSmartStats,
  GameSession,
  GameMode,
  MathGameStats,
  PlayerProfile,
  getProfiles,
  getActiveProfileId,
  setActiveProfile,
  createProfile,
  recordOpResults,
  getOpAggregateStats,
  CONCRETE_OPERATIONS,
  OpResult,
  OpAggregateStats,
  ConcreteOperationType
} from "./services/mathGameStorage"
import {
  selectSmartOperation,
  determineSmartLevel
} from "./utils/mathGameUtils"

// Input de sesión a guardar: extiende el payload de saveGameSession con un
// campo extra `wasManuallyFinished`. Se persiste tal cual en localStorage
// (saveGameSession hace spread del objeto) sin tocar el tipo del storage.
type SavedGameSessionInput = Omit<GameSession, 'id' | 'timestamp' | 'profileId'> & {
  wasManuallyFinished: boolean
}

export default function JuegosMatematicos() {
  const router = useRouter()
  const { t } = useApp()
  
  // -- Configuration State --
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel>('facil')
  const [selectedMode, setSelectedMode] = useState<GameMode>('timed')
  const [selectedOperation, setSelectedOperation] = useState<OperationType>('sum')
  
  // Time Configuration
  const [selectedTime, setSelectedTime] = useState<number>(60)
  const [isCustomTime, setIsCustomTime] = useState(false)

  const [customTimeInput, setCustomTimeInput] = useState('60')
  const [showSmartInfo, setShowSmartInfo] = useState(false)

  // -- Game State --
  const [gameActive, setGameActive] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [currentExercise, setCurrentExercise] = useState<MathExercise | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  
  // -- Stats & Timer --
  const [stats, setStats] = useState({ correct: 0, incorrect: 0, total: 0 })
  const [sessionSmartStats, setSessionSmartStats] = useState<Partial<MathGameStats>>({})
  const [timeLeft, setTimeLeft] = useState(60)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [currentSessionOpsPerSec, setCurrentSessionOpsPerSec] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  // Snapshot vivo del estado del juego para el auto-guardado al salir (evita
  // closures obsoletos en los handlers de beforeunload / cleanup de unmount).
  const liveGameRef = useRef({
    gameActive: false,
    selectedMode: selectedMode as GameMode,
    startTime: null as number | null,
    correct: 0,
    incorrect: 0,
    selectedOperation: selectedOperation as OperationType,
    selectedLevel: selectedLevel as DifficultyLevel,
  })
  const sessionSavedRef = useRef(false)

  // -- Per-operation measurement (additive) --
  // Marca de tiempo en que se mostró el ejercicio actual, para medir el tiempo
  // de respuesta (ms) por ejercicio. Acumulamos un resultado por ejercicio.
  const exerciseShownAtRef = useRef<number | null>(null)
  const opResultsRef = useRef<OpResult[]>([])
  // Desglose por operación de la partida recién terminada (para Game Over).
  const [opBreakdown, setOpBreakdown] = useState<OpAggregateStats | null>(null)

  // -- History --
  const [history, setHistory] = useState<GameSession[]>([])
  const [showHistory, setShowHistory] = useState(false)
  
  // -- Player Profiles --
  const [profiles, setProfiles] = useState<PlayerProfile[]>([])
  const [activeProfileId, setActiveProfileIdState] = useState<string>('serio')
  const [showNewProfileInput, setShowNewProfileInput] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [historyFilterProfile, setHistoryFilterProfile] = useState<string | 'all'>('all')

  // Load profiles and history on mount
  useEffect(() => {
    const loadedProfiles = getProfiles()
    setProfiles(loadedProfiles)
    const activeId = getActiveProfileId()
    setActiveProfileIdState(activeId)
    setHistoryFilterProfile(activeId) // Default to active profile
    setHistory(getGameHistory())
  }, [])

  // Timer Logic
  useEffect(() => {
    if (gameActive && selectedMode === 'timed' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            endGame()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timeLeft is already a dep so the interval is recreated every tick with a fresh endGame closure; adding endGame (recreated each render) would needlessly tear down/rebuild the interval and risk drift in the countdown
  }, [gameActive, selectedMode, timeLeft])

  // Mantén un snapshot vivo del estado del juego para el auto-guardado al salir.
  useEffect(() => {
    liveGameRef.current = {
      gameActive,
      selectedMode,
      startTime,
      correct: stats.correct,
      incorrect: stats.incorrect,
      selectedOperation,
      selectedLevel,
    }
  }, [gameActive, selectedMode, startTime, stats.correct, stats.incorrect, selectedOperation, selectedLevel])

  // Auto-guardado de la sesión de modo libre si el usuario sale sin pulsar
  // "Terminar" (cierra pestaña/recarga o desmonta el componente). Marca la
  // sesión como wasManuallyFinished:false para distinguir cierre incompleto.
  useEffect(() => {
    const autoSaveFreeSession = () => {
      const live = liveGameRef.current
      if (sessionSavedRef.current) return
      // Solo modo libre con partida en curso y al menos un intento.
      if (!live.gameActive || live.selectedMode !== 'free') return
      const totalAttempts = live.correct + live.incorrect
      if (totalAttempts === 0) return

      const finalDuration = live.startTime ? (Date.now() - live.startTime) / 1000 : 0
      const accuracy = totalAttempts > 0 ? (live.correct / totalAttempts) * 100 : 0
      const opsPerSec = finalDuration > 0 ? totalAttempts / finalDuration : 0

      const sessionData: SavedGameSessionInput = {
        mode: live.selectedMode,
        operation: live.selectedOperation,
        level: live.selectedLevel,
        durationSeconds: finalDuration,
        totalAttempts,
        correctCount: live.correct,
        incorrectCount: live.incorrect,
        accuracyPercentage: accuracy,
        opsPerSecond: opsPerSec,
        wasManuallyFinished: false,
      }
      saveGameSession(sessionData)
      // Persiste también la medición por operación de la partida abandonada.
      if (opResultsRef.current.length > 0) {
        recordOpResults(opResultsRef.current)
        opResultsRef.current = []
      }
      sessionSavedRef.current = true
    }

    window.addEventListener('beforeunload', autoSaveFreeSession)
    return () => {
      window.removeEventListener('beforeunload', autoSaveFreeSession)
      // Desmontaje del componente (p. ej. navegación interna) sin terminar.
      autoSaveFreeSession()
    }
  }, [])

  const getLevelContent = () => {
    switch (selectedLevel) {
      case 'facil':
        return { title: t('math_games.level_easy'), description: t('math_games.level_easy_desc'), icon: "🌱" }
      case 'medio':
        return { title: t('math_games.level_medium'), description: t('math_games.level_medium_desc'), icon: "🌿" }
      case 'dificil':
        return { title: t('math_games.level_hard'), description: t('math_games.level_hard_desc'), icon: "🌳" }
    }
  }

  const startGame = () => {
    setGameActive(true)
    setIsGameOver(false)
    setStats({ correct: 0, incorrect: 0, total: 0 })
    setFeedback(null)
    setUserAnswer('')
    setStartTime(Date.now())
    sessionSavedRef.current = false // Nueva partida: permite auto-guardado al salir
    opResultsRef.current = [] // Reinicia el buffer de medición por operación
    setOpBreakdown(null)

    if (selectedMode === 'timed') {
      // Use selected time (or custom)
      let timeToSet = selectedTime
      if (isCustomTime) {
        const parsed = parseInt(customTimeInput)
        if (!isNaN(parsed) && parsed > 0) {
          timeToSet = parsed
        } else {
          timeToSet = 60 // Fallback
        }
      }
      setTimeLeft(timeToSet)
    }
    
    if (selectedMode === 'smart') {
      const smartStats = getSmartStats()
      const op = selectSmartOperation(smartStats)
      const level = determineSmartLevel(op, smartStats)
      // We don't update selectedOperation/Level state to avoid UI jumping, 
      // but we generate the exercise with these parameters.
      // Actually, updating them might be good for feedback, but let's keep it internal or update state if we want to show it.
      // Let's update state so the user sees what they are playing
      setSelectedOperation(op)
      setSelectedLevel(level)
      setCurrentExercise(generateExercise(op, level))
    } else {
      setCurrentExercise(generateExercise(selectedOperation, selectedLevel))
    }
    // Inicia el cronómetro del primer ejercicio para la medición por operación.
    exerciseShownAtRef.current = Date.now()
  }

  const endGame = (wasManuallyFinished: boolean = true) => {
    setGameActive(false)
    setIsGameOver(true)
    if (timerRef.current) clearInterval(timerRef.current)

    // Calculate final stats
    const endTime = Date.now()

    // Determine initial duration for timed mode
    let initialDuration = selectedTime
    if (isCustomTime) {
       const parsed = parseInt(customTimeInput)
       initialDuration = (!isNaN(parsed) && parsed > 0) ? parsed : 60
    }

    const duration = selectedMode === 'timed'
      ? initialDuration - timeLeft
      : (startTime ? (endTime - startTime) / 1000 : 0)

    // For timed mode, if it ended by timeout, duration is full duration
    const finalDuration = selectedMode === 'timed' && timeLeft === 0 ? initialDuration : duration

    const totalAttempts = stats.correct + stats.incorrect
    const accuracy = totalAttempts > 0 ? (stats.correct / totalAttempts) * 100 : 0
    const opsPerSec = finalDuration > 0 ? totalAttempts / finalDuration : 0

    // Ops/s de la sesión ACTUAL (no de la sesión anterior del historial)
    setCurrentSessionOpsPerSec(opsPerSec)

    // wasManuallyFinished: distingue cierre limpio (botón "Terminar"/timeout)
    // vs cierre incompleto (el usuario abandonó el modo libre sin terminar).
    // Se persiste como campo extra de la sesión (extiende GameSession en runtime).
    const sessionData: SavedGameSessionInput = {
      mode: selectedMode,
      operation: selectedOperation,
      level: selectedLevel,
      durationSeconds: finalDuration,
      totalAttempts,
      correctCount: stats.correct,
      incorrectCount: stats.incorrect,
      accuracyPercentage: accuracy,
      opsPerSecond: opsPerSec,
      wasManuallyFinished
    }

    saveGameSession(sessionData)
    sessionSavedRef.current = true // Ya guardada: evita auto-guardado duplicado al salir

    if (selectedMode === 'smart') {
      updateSmartStats(sessionSmartStats)
    }

    // Persiste la medición por operación (precisión + tiempo) y prepara el
    // desglose acumulado del perfil para mostrarlo en la pantalla de fin.
    const updatedOpStats = recordOpResults(opResultsRef.current)
    setOpBreakdown(updatedOpStats ?? getOpAggregateStats())
    opResultsRef.current = []

    setHistory(getGameHistory()) // Refresh history
  }

  const checkAnswer = () => {
    if (!currentExercise) return

    const numAnswer = parseInt(userAnswer)
    if (isNaN(numAnswer)) return

    const isCorrect = numAnswer === currentExercise.answer

    // Update session smart stats
    const currentOp: ConcreteOperationType = currentExercise.operator === '+' ? 'sum' :
                     currentExercise.operator === '-' ? 'sub' :
                     currentExercise.operator === '×' ? 'mul' : 'div';

    // Medición por operación: registra acierto + tiempo (ms) de este ejercicio.
    const now = Date.now()
    const timeMs = exerciseShownAtRef.current !== null ? now - exerciseShownAtRef.current : 0
    opResultsRef.current.push({ op: currentOp, correct: isCorrect, timeMs })

    setSessionSmartStats(prev => {
      const opStats = prev[currentOp] || { totalAttempts: 0, correctCount: 0, incorrectCount: 0, lastLevel: selectedLevel };
      return {
        ...prev,
        [currentOp]: {
          ...opStats,
          totalAttempts: opStats.totalAttempts + 1,
          correctCount: opStats.correctCount + (isCorrect ? 1 : 0),
          incorrectCount: opStats.incorrectCount + (isCorrect ? 0 : 1),
          lastLevel: selectedLevel
        }
      }
    })

    if (isCorrect) {
      setFeedback({ type: 'success', message: t('math_games.feedback_correct') })
      setStats(prev => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1 }))
    } else {
      setFeedback({ type: 'error', message: t('math_games.feedback_error', { answer: currentExercise.answer }) })
      setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1, total: prev.total + 1 }))
    }

    setUserAnswer('')
    
    if (selectedMode === 'smart') {
      const smartStats = getSmartStats()
      const op = selectSmartOperation(smartStats)
      const level = determineSmartLevel(op, smartStats)
      
      setSelectedOperation(op)
      setSelectedLevel(level)
      setCurrentExercise(generateExercise(op, level))
    } else {
      setCurrentExercise(generateExercise(selectedOperation, selectedLevel))
    }
    // Reinicia el cronómetro para medir el tiempo del siguiente ejercicio.
    exerciseShownAtRef.current = Date.now()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') checkAnswer()
  }

  // Helper to format operation name
  const getOpName = (op: OperationType) => {
    const map: Record<OperationType, string> = {
      sum: t('math_games.op_sum'), 
      sub: t('math_games.op_sub'), 
      mul: t('math_games.op_mul'), 
      div: t('math_games.op_div'), 
      mixed: t('math_games.op_mixed')
    }
    return map[op]
  }

  // Iconos por operación para el desglose de medición (reusa el estilo emoji).
  const OP_ICONS: Record<ConcreteOperationType, string> = {
    sum: '➕', sub: '➖', mul: '✖️', div: '➗'
  }

  // Formatea el tiempo medio por operación de forma legible (ms o s).
  const formatAvgTime = (totalTimeMs: number, attempts: number): string => {
    if (attempts === 0) return '—'
    const avgMs = totalTimeMs / attempts
    return avgMs < 1000 ? `${Math.round(avgMs)} ms` : `${(avgMs / 1000).toFixed(1)} s`
  }

  // Operaciones con al menos un intento registrado en el acumulado del perfil.
  const breakdownRows = opBreakdown
    ? CONCRETE_OPERATIONS.filter(op => opBreakdown[op].totalAttempts > 0)
    : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8 pb-mobile-nav dark:from-slate-900 dark:to-slate-800 transition-colors duration-500">
      <div className="max-w-4xl mx-auto">
        {/* Header Navigation */}
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('chat.back_to_map')}
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={() => setShowHistory(!showHistory)}
            className="text-indigo-600 dark:text-indigo-400"
          >
            {showHistory ? t('math_games.history_button_hide') : t('math_games.history_button_show')}
          </Button>
        </div>

        {/* History View */}
        {showHistory && (
          <Card className="mb-6 bg-white/90 backdrop-blur border-indigo-200 dark:bg-slate-800/90 dark:border-slate-600 animate-in slide-in-from-top-4">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h3 className="text-xl font-bold dark:text-white">{t('math_games.history_title')}</h3>
                
                {/* Profile Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Filtrar:</span>
                  <select
                    value={historyFilterProfile}
                    onChange={(e) => setHistoryFilterProfile(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm dark:text-white focus:ring-2 focus:ring-indigo-200 outline-none"
                  >
                    <option value="all">Todos los perfiles</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* DESKTOP: Tabla completa (md+) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-300">
                    <tr>
                      <th className="px-4 py-2">Perfil</th>
                      <th className="px-4 py-2">Fecha</th>
                      <th className="px-4 py-2">Modo</th>
                      <th className="px-4 py-2">Op</th>
                      <th className="px-4 py-2">Nivel</th>
                      <th className="px-4 py-2">Aciertos/Total</th>
                      <th className="px-4 py-2">%</th>
                      <th className="px-4 py-2">Ops/s</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history
                      .filter(game => historyFilterProfile === 'all' || game.profileId === historyFilterProfile)
                      .map((game) => {
                        const profile = profiles.find(p => p.id === game.profileId);
                        return (
                          <tr key={game.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
                            <td className="px-4 py-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-slate-600 rounded-full text-xs">
                                {profile?.emoji || '👤'} {profile?.name || 'Desconocido'}
                              </span>
                            </td>
                            <td className="px-4 py-2">{new Date(game.timestamp).toLocaleDateString()} {new Date(game.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                            <td className="px-4 py-2 capitalize">
                              {game.mode === 'timed' ? t('math_games.mode_timed') : game.mode === 'smart' ? t('math_games.mode_smart') : t('math_games.mode_free')}
                            </td>
                            <td className="px-4 py-2">{getOpName(game.operation)}</td>
                            <td className="px-4 py-2 capitalize">{game.level}</td>
                            <td className="px-4 py-2">{game.correctCount}/{game.totalAttempts}</td>
                            <td className="px-4 py-2 font-bold text-indigo-600 dark:text-indigo-400">{game.accuracyPercentage.toFixed(0)}%</td>
                            <td className="px-4 py-2">{game.opsPerSecond.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    {history.filter(game => historyFilterProfile === 'all' || game.profileId === historyFilterProfile).length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-4 text-center text-gray-500">{t('math_games.history_empty')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE: Cards apilables (< md) */}
              <div className="md:hidden space-y-2.5">
                {history
                  .filter(game => historyFilterProfile === 'all' || game.profileId === historyFilterProfile)
                  .map((game) => {
                    const profile = profiles.find(p => p.id === game.profileId);
                    const modeLabel = game.mode === 'timed' ? t('math_games.mode_timed') : game.mode === 'smart' ? t('math_games.mode_smart') : t('math_games.mode_free');
                    return (
                      <div key={game.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-slate-600 rounded-full text-xs truncate max-w-[60%]">
                            {profile?.emoji || '👤'} {profile?.name || 'Desconocido'}
                          </span>
                          <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                            {game.accuracyPercentage.toFixed(0)}%
                          </span>
                        </div>
                        {/* Fila 1: Modo | Operación | Nivel */}
                        <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Modo</div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{modeLabel}</div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Operación</div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{getOpName(game.operation)}</div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Nivel</div>
                            <div className="text-xs font-medium capitalize text-gray-700 dark:text-gray-200 truncate">{game.level}</div>
                          </div>
                        </div>
                        {/* Fila 2: Aciertos | Ops/s */}
                        <div className="grid grid-cols-2 gap-x-2 mt-2">
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Aciertos</div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{game.correctCount}/{game.totalAttempts}</div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Ops/s</div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{game.opsPerSecond.toFixed(2)}</div>
                          </div>
                        </div>
                        {/* Fila 3: Fecha */}
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                          {new Date(game.timestamp).toLocaleDateString()} · {new Date(game.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    );
                  })}
                {history.filter(game => historyFilterProfile === 'all' || game.profileId === historyFilterProfile).length === 0 && (
                  <div className="text-center py-6 text-gray-500 text-sm">{t('math_games.history_empty')}</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/80 backdrop-blur-sm border-indigo-200 dark:bg-slate-800/80 dark:border-slate-600 shadow-xl">
          <CardContent className="p-4 sm:p-6 md:p-8">
            {/* Title */}
            <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-6">
              <div className="text-4xl sm:text-5xl md:text-6xl shrink-0">🎮</div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-gray-800 dark:text-white leading-tight break-words">
                  {t('math_games.title')}
                </h1>
                <p className="text-xs sm:text-base text-gray-600 dark:text-gray-300 mt-0.5 sm:mt-1">
                  {t('math_games.subtitle')}
                </p>
              </div>
            </div>

            {!gameActive && !isGameOver ? (
              /* -- SETUP SCREEN -- */
              <div className="space-y-8 animate-in fade-in">
                {/* Profile Selector */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Jugando como
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {profiles.map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => {
                          setActiveProfile(profile.id)
                          setActiveProfileIdState(profile.id)
                        }}
                        className={`px-4 py-2 rounded-full border-2 transition-all flex items-center gap-2 ${
                          activeProfileId === profile.id 
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 font-bold' 
                            : 'border-gray-200 dark:border-slate-700 hover:border-indigo-300'
                        }`}
                      >
                        <span className="text-lg">{profile.emoji}</span>
                        <span className="dark:text-white">{profile.name}</span>
                      </button>
                    ))}
                    
                    {/* Add New Profile Button */}
                    {!showNewProfileInput ? (
                      <button
                        onClick={() => setShowNewProfileInput(true)}
                        className="px-4 py-2 rounded-full border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-indigo-400 text-gray-500 dark:text-gray-400 transition-all flex items-center gap-2"
                      >
                        <span>➕</span>
                        <span>Nuevo</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 animate-in fade-in">
                        <input
                          type="text"
                          value={newProfileName}
                          onChange={(e) => setNewProfileName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newProfileName.trim()) {
                              const newP = createProfile(newProfileName.trim())
                              setProfiles(getProfiles())
                              setActiveProfile(newP.id)
                              setActiveProfileIdState(newP.id)
                              setNewProfileName('')
                              setShowNewProfileInput(false)
                            }
                          }}
                          placeholder="Nombre del perfil..."
                          className="px-3 py-2 rounded-full border-2 border-indigo-400 text-sm focus:ring-2 focus:ring-indigo-200 outline-none dark:bg-slate-700 dark:text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            if (newProfileName.trim()) {
                              const newP = createProfile(newProfileName.trim())
                              setProfiles(getProfiles())
                              setActiveProfile(newP.id)
                              setActiveProfileIdState(newP.id)
                              setNewProfileName('')
                            }
                            setShowNewProfileInput(false)
                          }}
                          className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            setNewProfileName('')
                            setShowNewProfileInput(false)
                          }}
                          className="p-2 rounded-full bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300"
                        >
                          ✗
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Las estadísticas se guardan por separado para cada perfil
                  </p>
                </div>

                {/* Mode Selector */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Modo de Juego</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <button
                      onClick={() => setSelectedMode('timed')}
                      className={`p-4 rounded-xl border-2 transition-all ${selectedMode === 'timed' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-indigo-300'}`}
                    >
                      <div className="text-2xl mb-2">⏱️</div>
                      <div className="font-bold text-gray-800 dark:text-white">{t('math_games.mode_timed')}</div>
                      <div className="text-xs text-gray-500">{t('math_games.mode_timed_desc')}</div>
                    </button>
                    <button
                      onClick={() => setSelectedMode('free')}
                      className={`p-4 rounded-xl border-2 transition-all ${selectedMode === 'free' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-indigo-300'}`}
                    >
                      <div className="text-2xl mb-2">🧘</div>
                      <div className="font-bold text-gray-800 dark:text-white">{t('math_games.mode_free')}</div>
                      <div className="text-xs text-gray-500">{t('math_games.mode_free_desc')}</div>
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setSelectedMode('smart')}
                        className={`w-full h-full p-4 rounded-xl border-2 transition-all ${selectedMode === 'smart' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-purple-300'}`}
                      >
                        <div className="text-2xl mb-2">🧠</div>
                        <div className="font-bold text-gray-800 dark:text-white">{t('math_games.mode_smart')}</div>
                        <div className="text-xs text-gray-500">{t('math_games.mode_smart_desc')}</div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowSmartInfo(!showSmartInfo)
                        }}
                        aria-label="Información sobre modo Smart"
                        aria-expanded={showSmartInfo}
                        className="absolute top-1.5 right-1.5 w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 text-sm font-bold flex items-center justify-center hover:bg-gray-300 dark:hover:bg-slate-500 active:scale-95 transition-transform"
                      >
                        i
                      </button>
                    </div>
                  </div>
                  
                  {/* Smart Mode Info */}
                  {showSmartInfo && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800 text-sm text-gray-700 dark:text-gray-300 animate-in fade-in slide-in-from-top-2">
                      <p className="font-bold mb-2">{t('math_games.smart_info_title')}</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>{t('math_games.smart_info_1')}</li>
                        <li>{t('math_games.smart_info_2')}</li>
                        <li>{t('math_games.smart_info_3')}</li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Time Selector (Only for Timed Mode) */}
                {selectedMode === 'timed' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('math_games.time_label')}</label>
                    <div className="flex flex-wrap gap-2">
                      {[10, 30, 60].map((seconds) => (
                        <Button
                          key={seconds}
                          variant={!isCustomTime && selectedTime === seconds ? 'default' : 'outline'}
                          onClick={() => {
                            setIsCustomTime(false)
                            setSelectedTime(seconds)
                          }}
                          className={!isCustomTime && selectedTime === seconds ? 'bg-indigo-600' : ''}
                        >
                          {seconds}s
                        </Button>
                      ))}
                      <Button
                        variant={isCustomTime ? 'default' : 'outline'}
                        onClick={() => setIsCustomTime(true)}
                        className={isCustomTime ? 'bg-indigo-600' : ''}
                      >
                        {t('math_games.custom_time')}
                      </Button>
                    </div>
                    {isCustomTime && (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={customTimeInput}
                          onChange={(e) => setCustomTimeInput(e.target.value)}
                          className="w-32"
                          placeholder="Segundos"
                          aria-label="Tiempo personalizado en segundos"
                        />
                        <span className="text-sm text-gray-500">{t('math_games.seconds')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Operation Selector (Hidden in Smart Mode) */}
                {selectedMode !== 'smart' && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('math_games.operation_label')}</label>
                    <div className="flex flex-wrap gap-2">
                      {(['sum', 'sub', 'mul', 'div', 'mixed'] as OperationType[]).map((op) => (
                        <Button
                          key={op}
                          variant={selectedOperation === op ? 'default' : 'outline'}
                          onClick={() => setSelectedOperation(op)}
                          className={`capitalize ${selectedOperation === op ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                        >
                          {getOpName(op)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Level Selector (Hidden in Smart Mode) */}
                {selectedMode !== 'smart' && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('math_games.difficulty_label')}</label>
                    <div className="flex gap-4">
                      {(['facil', 'medio', 'dificil'] as DifficultyLevel[]).map((level) => (
                        <Button
                          key={level}
                          variant={selectedLevel === level ? 'default' : 'outline'}
                          onClick={() => setSelectedLevel(level)}
                          className={`flex-1 capitalize ${
                            selectedLevel === level 
                              ? level === 'facil' ? 'bg-green-500 hover:bg-green-600' 
                              : level === 'medio' ? 'bg-yellow-500 hover:bg-yellow-600' 
                              : 'bg-red-500 hover:bg-red-600'
                              : ''
                          }`}
                        >
                          {level === 'facil' ? t('math_games.level_easy') : level === 'medio' ? t('math_games.level_medium') : t('math_games.level_hard')}
                        </Button>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      {getLevelContent().description}
                    </p>
                  </div>
                )}

                <Button 
                  size="lg" 
                  className="w-full text-lg py-6 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none"
                  onClick={startGame}
                >
                  {t('math_games.start_button')}
                </Button>
              </div>
            ) : isGameOver ? (
              /* -- GAME OVER SCREEN -- */
              <div className="text-center space-y-8 animate-in zoom-in-95">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{t('math_games.game_over')}</h2>
                  <p className="text-gray-500">{t('math_games.summary_title')}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-indigo-50 dark:bg-slate-700 rounded-xl">
                    <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.correct}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{t('math_games.correct')}</div>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-slate-700 rounded-xl">
                    <div className="text-3xl font-bold text-red-500">{stats.incorrect}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{t('math_games.incorrect')}</div>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-slate-700 rounded-xl">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{t('math_games.accuracy')}</div>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-slate-700 rounded-xl">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {currentSessionOpsPerSec.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{t('math_games.ops_per_sec')}</div>
                  </div>
                </div>

                {/* Desglose por operación (precisión + velocidad media acumuladas) */}
                <div className="text-left">
                  <div className="flex items-baseline justify-between gap-2 mb-3">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white">
                      📊 Por operación
                    </h3>
                    <span className="text-xs text-gray-400 dark:text-gray-500">Acumulado del perfil</span>
                  </div>

                  {breakdownRows.length > 0 && opBreakdown ? (
                    <div className="space-y-2">
                      {/* Cabecera de columnas (oculta etiquetas redundantes en móvil) */}
                      <div className="grid grid-cols-[1fr_auto_auto] gap-2 sm:gap-4 px-3 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        <span>Operación</span>
                        <span className="text-right w-20">{t('math_games.accuracy')}</span>
                        <span className="text-right w-20">Tiempo medio</span>
                      </div>
                      {breakdownRows.map((op) => {
                        const agg = opBreakdown[op]
                        const acc = agg.totalAttempts > 0
                          ? Math.round((agg.correctCount / agg.totalAttempts) * 100)
                          : 0
                        const accColor = acc >= 80
                          ? 'text-green-600 dark:text-green-400'
                          : acc >= 50
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-500 dark:text-red-400'
                        return (
                          <div
                            key={op}
                            className="grid grid-cols-[1fr_auto_auto] items-center gap-2 sm:gap-4 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-lg shrink-0" aria-hidden="true">{OP_ICONS[op]}</span>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                  {getOpName(op)}
                                </div>
                                <div className="text-[11px] text-gray-400 dark:text-gray-500">
                                  {agg.correctCount}/{agg.totalAttempts}
                                </div>
                              </div>
                            </div>
                            <div className={`text-right w-20 font-bold tabular-nums ${accColor}`}>
                              {acc}%
                            </div>
                            <div className="text-right w-20 font-medium tabular-nums text-gray-700 dark:text-gray-200">
                              {formatAvgTime(agg.totalTimeMs, agg.totalAttempts)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-center text-sm text-gray-500 dark:text-gray-400">
                      Aún no hay datos por operación. ¡Juega una partida para empezar a medir tu progreso!
                    </div>
                  )}
                </div>

                <div className="flex gap-4 justify-center">
                  <Button variant="outline" size="lg" onClick={() => setIsGameOver(false)}>
                    {t('math_games.change_config')}
                  </Button>
                  <Button size="lg" onClick={startGame} className="bg-indigo-600 hover:bg-indigo-700">
                    {t('math_games.play_again')}
                  </Button>
                </div>
              </div>
            ) : (
              /* -- ACTIVE GAME SCREEN -- */
              <div className="space-y-8">
                {/* Top Bar: Timer & Stats */}
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex gap-6">
                    <div className="text-green-600 font-bold">✓ {stats.correct}</div>
                    <div className="text-red-500 font-bold">✗ {stats.incorrect}</div>
                  </div>
                  {selectedMode === 'timed' && (
                    <div className={`text-2xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-700 dark:text-gray-200'}`}>
                      {timeLeft}s
                    </div>
                  )}
                  {selectedMode === 'free' && (
                     <Button variant="ghost" size="sm" onClick={() => endGame(true)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                       {t('math_games.finish_game')}
                     </Button>
                  )}
                </div>

                {/* Question Area */}
                <div className="text-center py-8">
                  <div className="text-5xl md:text-6xl font-bold text-gray-800 dark:text-white font-mono tracking-wider mb-8">
                    {currentExercise?.operands.join(` ${currentExercise.operator} `)} = ?
                  </div>

                  <div className="max-w-xs mx-auto space-y-4">
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9-]*"
                      enterKeyHint="send"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full text-center text-4xl p-4 rounded-xl border-2 border-indigo-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-white transition-all shadow-inner"
                      placeholder="?"
                      aria-label="Tu respuesta"
                      autoFocus
                    />
                    <Button 
                      onClick={checkAnswer}
                      className="w-full text-lg py-6"
                      size="lg"
                    >
                      {t('math_games.check_button')}
                    </Button>
                  </div>

                  {/* Feedback Message */}
                  <div className="h-12 mt-4">
                    {feedback && (
                      <div className={`inline-block px-6 py-2 rounded-full font-bold animate-in fade-in slide-in-from-bottom-2 ${
                        feedback.type === 'success' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                      }`}>
                        {feedback.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
