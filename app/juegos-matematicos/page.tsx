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
  MathGameStats
} from "./services/mathGameStorage"
import { 
  selectSmartOperation, 
  determineSmartLevel 
} from "./utils/mathGameUtils"

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
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  // -- History --
  const [history, setHistory] = useState<GameSession[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // Load history on mount
  useEffect(() => {
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
  }, [gameActive, selectedMode, timeLeft])

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
  }

  const endGame = () => {
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

    const sessionData = {
      mode: selectedMode,
      operation: selectedOperation,
      level: selectedLevel,
      durationSeconds: finalDuration,
      totalAttempts,
      correctCount: stats.correct,
      incorrectCount: stats.incorrect,
      accuracyPercentage: accuracy,
      opsPerSecond: opsPerSec
    }

    saveGameSession(sessionData)
    
    if (selectedMode === 'smart') {
      updateSmartStats(sessionSmartStats)
    }
    
    setHistory(getGameHistory()) // Refresh history
  }

  const checkAnswer = () => {
    if (!currentExercise) return

    const numAnswer = parseInt(userAnswer)
    if (isNaN(numAnswer)) return

    const isCorrect = numAnswer === currentExercise.answer
    
    // Update session smart stats
    const currentOp = currentExercise.operator === '+' ? 'sum' : 
                     currentExercise.operator === '-' ? 'sub' :
                     currentExercise.operator === '×' ? 'mul' : 'div';
                     
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8 dark:from-slate-900 dark:to-slate-800 transition-colors duration-500">
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
              <h3 className="text-xl font-bold mb-4 dark:text-white">{t('math_games.history_title')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-300">
                    <tr>
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
                    {history.map((game) => (
                      <tr key={game.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
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
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 text-center text-gray-500">{t('math_games.history_empty')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/80 backdrop-blur-sm border-indigo-200 dark:bg-slate-800/80 dark:border-slate-600 shadow-xl">
          <CardContent className="p-6 md:p-8">
            {/* Title */}
            <div className="flex items-center gap-4 mb-6">
              <div className="text-5xl md:text-6xl">🎮</div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white">
                  {t('math_games.title')}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  {t('math_games.subtitle')}
                </p>
              </div>
            </div>

            {!gameActive && !isGameOver ? (
              /* -- SETUP SCREEN -- */
              <div className="space-y-8 animate-in fade-in">
                {/* Mode Selector */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Modo de Juego</label>
                  <div className="grid grid-cols-3 gap-4">
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
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowSmartInfo(!showSmartInfo)
                        }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 text-xs flex items-center justify-center hover:bg-gray-300 dark:hover:bg-slate-500"
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
                          value={customTimeInput}
                          onChange={(e) => setCustomTimeInput(e.target.value)}
                          className="w-32"
                          placeholder="Segundos"
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
                      {history.length > 0 ? history[0].opsPerSecond.toFixed(2) : '0.00'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{t('math_games.ops_per_sec')}</div>
                  </div>
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
                     <Button variant="ghost" size="sm" onClick={endGame} className="text-red-500 hover:text-red-600 hover:bg-red-50">
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
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full text-center text-4xl p-4 rounded-xl border-2 border-indigo-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-white transition-all shadow-inner"
                      placeholder="?"
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
