"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTimer } from "../hooks/useTimer"
import { useSounds } from "../hooks/useSounds"
import { useCollectibles } from "../hooks/useCollectibles"
import { TimerDisplay } from "./TimerDisplay"
import { TimerControls } from "./TimerControls"
import { TabBar, TimerTab } from "./TabBar"
import { TodoList } from "./TodoList"
import { HabitTracker } from "./HabitTracker"
import { GoalsPanel } from "./GoalsPanel"
import { SoundSettings } from "./SoundSettings"
import { AnimationSelector } from "./AnimationSelector"
import { ArrowLeft, Target, Clock, Coffee, Settings2, Volume2, Sparkles, CheckCircle, Plus, ArrowRight } from "lucide-react"

const PRESET_MINUTES = [15, 25, 45, 60]

export function FocusTimerPage() {
  const router = useRouter()
  const timer = useTimer(25, 0)
  const sounds = useSounds()
  const collectibles = useCollectibles()
  
  const [goal, setGoal] = useState("")
  const [isBreakMode, setIsBreakMode] = useState(false)
  const [isCustomTime, setIsCustomTime] = useState(false)
  const [activeTab, setActiveTab] = useState<TimerTab>("focus")
  const [showSettings, setShowSettings] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [isWaitingConfirmation, setIsWaitingConfirmation] = useState(false)
  const [quickTask, setQuickTask] = useState("")
  const [quickTier, setQuickTier] = useState<"S" | "A" | "B" | "C">("A")
  
  // Persistent durations for switching modes
  const [focusDuration, setFocusDuration] = useState({ m: 25, s: 0 })
  const [breakDuration, setBreakDuration] = useState({ m: 5, s: 0 })
  const [totalTargetDuration, setTotalTargetDuration] = useState(120) // Default 2h
  const [isJornadaMode, setIsJornadaMode] = useState(false)
  
  // Advanced Task Tracking
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [activeTaskDescription, setActiveTaskDescription] = useState<string | undefined>()
  const [taskEstimatedMinutes, setTaskEstimatedMinutes] = useState<number | undefined>()
  const [taskStartTime, setTaskStartTime] = useState<number | null>(null)
  const [sessionTaskLog, setSessionTaskLog] = useState<{name: string, est: number, real: number}[]>([])
  
  // Estimation Modal State
  const [showEstimationModal, setShowEstimationModal] = useState(false)
  const [pendingTask, setPendingTask] = useState<{id: string, text: string, description?: string} | null>(null)

  const isTimerActive = timer.status !== "idle"

  const handleAddQuickTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickTask.trim()) return
    const saved = localStorage.getItem("focus_timer_todos")
    const todos = saved ? JSON.parse(saved) : []
    const newTodo = {
      id: Date.now().toString(),
      text: quickTask.trim(),
      completed: false,
      tier: quickTier,
    }
    localStorage.setItem("focus_timer_todos", JSON.stringify([newTodo, ...todos]))
    setQuickTask("")
    setQuickTier("A") // Reset to A
  }

  const handleSwitchToBreak = useCallback(() => {
    setIsBreakMode(true)
    timer.setMinutes(breakDuration.m)
    timer.setSeconds(breakDuration.s)
    setIsCustomTime(false)
    timer.reset()
    setIsWaitingConfirmation(false)
    sounds.stopLoop()
  }, [timer, sounds, breakDuration])

  const handleSwitchToFocus = useCallback(() => {
    setIsBreakMode(false)
    timer.setMinutes(focusDuration.m)
    timer.setSeconds(focusDuration.s)
    setIsCustomTime(false)
    timer.reset()
    setIsWaitingConfirmation(false)
    sounds.stopLoop()
  }, [timer, sounds, focusDuration])

  const handleConfirmTransition = () => {
    sounds.stopLoop()
    setIsWaitingConfirmation(false)

    if (timer.sequence.length > 0) {
      if (timer.isJourneyFinished) {
        // Stop here, journey is over!
        return
      }
      
      const nextIdx = timer.currentBlockIndex + 1
      if (nextIdx < timer.sequence.length) {
        setIsBreakMode(timer.sequence[nextIdx].type === "break")
        timer.nextBlock()
      } else {
        // Finished everything
        setIsBreakMode(false)
        timer.reset()
      }
      return
    }

    if (!isBreakMode) {
      // Finished Focus -> Start Break
      setIsBreakMode(true)
      timer.start(breakDuration.m, breakDuration.s)
    } else {
      // Finished Break -> Start Focus
      setIsBreakMode(false)
      timer.start(focusDuration.m, focusDuration.s)
    }
  }

  const handleCompleteTask = useCallback(() => {
    if (!goal && !activeTaskId) return
    
    // 1. Mark in localStorage
    const saved = localStorage.getItem("focus_timer_todos")
    let todos: any[] = []
    if (saved) {
      todos = JSON.parse(saved)
      const updated = todos.map((t: any) => 
        (activeTaskId ? t.id === activeTaskId : t.text === goal) ? { ...t, completed: true } : t
      )
      localStorage.setItem("focus_timer_todos", JSON.stringify(updated))
      todos = updated
    }

    // 2. Log timing
    if (taskStartTime) {
      const actualMinutes = Math.round((Date.now() - taskStartTime) / 60000)
      setSessionTaskLog(prev => [...prev, {
        name: goal,
        est: taskEstimatedMinutes || 0,
        real: actualMinutes
      }])
    }

    // 3. Jump to NEXT uncompleted task (Prioritized)
    const TIER_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 }
    const nextTask = todos
      .filter((t: any) => !t.completed)
      .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier])[0]
    
    if (nextTask) {
      setPendingTask({
        id: nextTask.id,
        text: nextTask.text,
        description: nextTask.description
      })
      setShowEstimationModal(true)
    } else {
      setGoal("")
      setActiveTaskId(null)
      setActiveTaskDescription(undefined)
      setTaskEstimatedMinutes(undefined)
      setTaskStartTime(null)
    }
  }, [goal, activeTaskId, taskStartTime, taskEstimatedMinutes])

  const handleStartFocusedTask = (estMinutes: number) => {
    if (!pendingTask) return
    
    setGoal(pendingTask.text)
    setActiveTaskId(pendingTask.id)
    setActiveTaskDescription(pendingTask.description)
    setTaskEstimatedMinutes(estMinutes)
    setTaskStartTime(Date.now())
    
    // Sync estimate to localStorage
    const saved = localStorage.getItem("focus_timer_todos")
    if (saved) {
      const todos = JSON.parse(saved)
      const updated = todos.map((t: any) => 
        t.id === pendingTask.id ? { ...t, estimatedMinutes: estMinutes } : t
      )
      localStorage.setItem("focus_timer_todos", JSON.stringify(updated))
    }

    setShowEstimationModal(false)
    setPendingTask(null)
    setActiveTab("focus")
  }

  const updateTaskEstimate = (val: number) => {
    setTaskEstimatedMinutes(val)
    if (activeTaskId) {
      const saved = localStorage.getItem("focus_timer_todos")
      if (saved) {
        const todos = JSON.parse(saved)
        const updated = todos.map((t: any) => 
          t.id === activeTaskId ? { ...t, estimatedMinutes: val } : t
        )
        localStorage.setItem("focus_timer_todos", JSON.stringify(updated))
      }
    }
  }

  const handlePresetSelect = (m: number) => {
    timer.setMinutes(m)
    timer.setSeconds(0)
    setIsCustomTime(false)
    
    // Save as persistent duration for current mode
    if (!isBreakMode) {
      setFocusDuration({ m, s: 0 })
    } else {
      setBreakDuration({ m, s: 0 })
    }
  }

  // Handle ambient sound lifecycle
  useEffect(() => {
    if (timer.status === "running") {
      sounds.startAmbient()
    } else {
      sounds.stopAmbient()
    }
    // Cleanup on every status change or unmount
    return () => sounds.stopAmbient()
  }, [timer.status, sounds.settings.ambientSound])

  // Play completion sound and handle transition state
  useEffect(() => {
    if (timer.status === "completed") {
      setIsWaitingConfirmation(true)
      sounds.playCompletion("alarm-loop", true) // Play looping alarm
      
      // Update stats only if focus completed
      if (!isBreakMode) {
        collectibles.addMinutes(timer.minutes)
        
        const savedStats = localStorage.getItem("focus_timer_stats")
        const stats = savedStats ? JSON.parse(savedStats) : { totalSessions: 0, totalMinutes: 0, todaySessions: 0, lastActivity: null }
        const today = new Date().toISOString().split("T")[0]
        if (stats.lastActivity !== today) stats.todaySessions = 0
        stats.totalSessions += 1
        stats.todaySessions += 1
        stats.totalMinutes += timer.minutes
        stats.lastActivity = today
        localStorage.setItem("focus_timer_stats", JSON.stringify(stats))
      }
    }
  }, [timer.status, isBreakMode, timer.minutes])

  const handleStop = useCallback(() => {
    if (sessionTaskLog.length > 0) {
      setShowSummary(true)
    }
    timer.reset()
    setGoal("")
    setTaskEstimatedMinutes(undefined)
    setTaskStartTime(null)
  }, [timer, sessionTaskLog])

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col relative overflow-x-hidden">
      {/* Estimation Modal */}
      {showEstimationModal && pendingTask && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-8 animate-scale-in">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto rotate-3">
                <Clock className="w-8 h-8 text-indigo-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Próxima Tarea</h2>
                <h3 className="text-xl font-bold text-white tracking-tight">{pendingTask.text}</h3>
                {pendingTask.description && (
                  <p className="text-xs text-slate-400 italic font-medium px-4">{pendingTask.description}</p>
                )}
              </div>
            </div>

            <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/30 space-y-4 text-center">
              <label className="text-[9px] font-black uppercase tracking-widest text-indigo-400">¿Cuántos minutos estimas?</label>
              <div className="flex items-center justify-center gap-4">
                <input 
                  autoFocus
                  type="number"
                  placeholder="25"
                  className="w-24 bg-transparent text-center text-5xl font-mono font-black text-white outline-none appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleStartFocusedTask(parseInt((e.target as HTMLInputElement).value) || 25)
                    }
                  }}
                  onChange={(e) => {
                    // Update state if needed, but we can just pull from ref or event on submit
                  }}
                  id="modal-est-input"
                />
                <span className="text-xl font-bold text-slate-700 font-mono mt-4">MIN</span>
              </div>
            </div>

            <button
              onClick={() => {
                const val = (document.getElementById('modal-est-input') as HTMLInputElement).value
                handleStartFocusedTask(parseInt(val) || 25)
              }}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              Comenzar Focus <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Session Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-widest text-white">Jornada Finalizada</h2>
              <p className="text-slate-500 text-sm">Aquí tienes el resumen de tu productividad</p>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
              {sessionTaskLog.map((log, i) => {
                const isUnderEst = log.real <= log.est
                return (
                  <div key={i} className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">{log.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-black">Estimado: {log.est}m</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-mono font-black ${isUnderEst ? "text-emerald-400" : "text-orange-400"}`}>
                        {log.real}m
                      </p>
                      <p className="text-[9px] uppercase font-bold text-slate-600">Tiempo Real</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => {
                setShowSummary(false)
                setSessionTaskLog([])
              }}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
            >
              Cerrar y Continuar
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SoundSettings
          settings={sounds.settings}
          setSettings={sounds.setSettings}
          onClose={() => setShowSettings(false)}
          onPlayPreview={sounds.playCompletion}
          onStartAmbient={sounds.startAmbient}
          onStopAmbient={sounds.stopAmbient}
          addCustomSound={sounds.addCustomSound}
          addCustomAmbient={sounds.addCustomAmbient}
          removeCustomSound={sounds.removeCustomSound}
          removeCustomAmbient={sounds.removeCustomAmbient}
          customSounds={sounds.customSounds}
          customAmbientSounds={sounds.customAmbientSounds}
        />
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 md:px-8 relative z-10">
        <div className="w-20"> {/* Spacer for symmetry */}
          {!isTimerActive && (
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm animate-fade-in"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Inicio</span>
            </button>
          )}
        </div>

        {!isTimerActive && (
          <h1 className="text-sm font-medium text-slate-400 uppercase tracking-widest animate-fade-in">
            Focus Timer
          </h1>
        )}

        <button
          onClick={() => setShowSettings(true)}
          className="p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl border border-slate-700/50 transition-all text-slate-400 hover:text-white group"
        >
          <Settings2 className="w-5 h-5 group-hover:rotate-45 transition-transform" />
        </button>
      </header>

      {/* Tab Bar Integration (Hidden during Focus) */}
      {!isTimerActive && <TabBar activeTab={activeTab} onTabChange={setActiveTab} />}

      {/* Main Content */}
      <main className={`flex-1 flex flex-col items-center justify-start ${isTimerActive ? "gap-10" : "gap-4"} px-4 pb-24 max-w-5xl mx-auto w-full animate-fade-in-up relative z-10`}>
        
        {activeTab === "focus" && (
          <div className={`w-full flex flex-col items-center ${isTimerActive ? "gap-10" : "gap-4"}`}>
            {/* Mode Toggle */}
            {/* Mode Toggle & Goal Row (Only when idle) */}
            {!isTimerActive ? (
              <div className="w-full max-w-sm flex items-center gap-2 animate-fade-in">
                <div className="flex items-center gap-1 bg-slate-800/80 rounded-xl p-1 backdrop-blur-sm border border-slate-700/50 flex-none">
                  <button
                    onClick={handleSwitchToFocus}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      !isBreakMode
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Target className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleSwitchToBreak}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      isBreakMode
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Coffee className="w-3 h-3" />
                  </button>
                </div>

                <div className="relative flex-1 group">
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => {
                      setGoal(e.target.value)
                      setActiveTaskId(null)
                    }}
                    onClick={() => setActiveTab("todos")}
                    placeholder="¿Cuál es tu objetivo?"
                    className="w-full px-4 py-2 bg-slate-800/40 border border-slate-700/20 rounded-xl text-white text-[11px] placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all cursor-pointer"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-3 h-3 text-slate-400" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3 animate-fade-in group">
                <div className="space-y-1">
                  <h2 className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em]">Trabajando en:</h2>
                  <h3 className="text-xl font-bold text-white tracking-wide">{goal || "Concentración Profunda"}</h3>
                  {activeTaskDescription && (
                    <p className="text-[10px] text-slate-400 italic max-w-xs mx-auto line-clamp-2">{activeTaskDescription}</p>
                  )}
                  {taskEstimatedMinutes && (
                    <div className="flex items-center justify-center gap-1.5 opacity-60">
                      <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Objetivo:</span>
                      <span className="text-[10px] text-indigo-400 font-mono font-bold">{taskEstimatedMinutes}m</span>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={handleCompleteTask}
                  className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 transition-all active:scale-90"
                >
                  ✓ Completar Tarea
                </button>
              </div>
            )}

            {/* Ambient Sound Indicator */}
            {timer.status === "running" && sounds.settings.ambientSound !== "none" && (
              <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full animate-pulse">
                <Volume2 className="w-3 h-3 text-indigo-400" />
                <span className="text-[10px] text-indigo-400 uppercase tracking-tighter font-bold">
                  Audio ambiente activo
                </span>
              </div>
            )}

            {/* Total Sequence Progress (Only when idle) */}
            {timer.sequence.length > 0 && !isTimerActive && (
              <div className="w-full max-w-sm space-y-2 animate-fade-in">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-indigo-400">Progreso Maratón</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Bloque {timer.currentBlockIndex + 1} de {timer.sequence.length}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                    style={{ width: `${timer.totalProgress * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Timer Display */}
            <TimerDisplay
              formattedTime={timer.formattedTime}
              progress={timer.progress}
              status={timer.status}
              goal={goal}
              skinId={collectibles.currentSkin}
              isWaitingConfirmation={isWaitingConfirmation}
            />

            {/* Configuration (only when idle) */}
            {timer.status === "idle" ? (
              <div className="w-full max-w-sm space-y-4 animate-fade-in flex flex-col items-center">

                {/* Ultra-Compact Journey Card */}
                <div className="w-full bg-slate-800/20 border border-slate-700/20 p-4 rounded-3xl space-y-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> Jornada Inteligente
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                      <span className="text-[8px] text-slate-600 font-bold uppercase">Smart</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 w-full">
                    {[
                      { label: "Focus", val: focusDuration.m, set: (v: number) => setFocusDuration({ m: v, s: 0 }) },
                      { label: "Break", val: breakDuration.m, set: (v: number) => setBreakDuration({ m: v, s: 0 }) },
                      { label: "Total (h)", val: totalTargetDuration / 60, set: (v: number) => setTotalTargetDuration(v * 60) }
                    ].map((item) => (
                      <div key={item.label} className="flex-1 flex items-center justify-between px-2 py-1 bg-slate-900/30 border border-slate-700/10 rounded-lg">
                        <label className="text-[7px] text-slate-500 uppercase font-black truncate">{item.label}</label>
                        <input 
                          type="number" 
                          step={item.label.includes('h') ? "0.5" : "1"}
                          value={item.val}
                          onChange={(e) => item.set(parseFloat(e.target.value) || 0)}
                          className="w-8 bg-transparent text-right text-[10px] text-indigo-400 font-mono font-bold outline-none leading-none appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      const seq: any[] = []
                      let accumulated = 0
                      const totalMin = totalTargetDuration
                      const fDuration = focusDuration.m
                      const bDuration = breakDuration.m
                      if (fDuration <= 0 || totalMin <= 0) {
                        // If user hasn't selected a goal, find the top one automatically
                        const saved = localStorage.getItem("focus_timer_todos")
                        const todos = saved ? JSON.parse(saved) : []
                        const nextTask = todos
                          .filter((t: any) => !t.completed)
                          .sort((a: any, b: any) => {
                            const TIER_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 }
                            return TIER_ORDER[a.tier] - TIER_ORDER[b.tier]
                          })[0]
                        
                        if (nextTask) {
                          setGoal(nextTask.text)
                          setActiveTaskId(nextTask.id)
                          setActiveTaskDescription(nextTask.description)
                          setTaskEstimatedMinutes(nextTask.estimatedMinutes)
                        }
                        return
                      }
                      while (accumulated < totalMin) {
                        const fTime = Math.min(fDuration, totalMin - accumulated)
                        if (fTime > 0) { seq.push({ type: 'focus', duration: fTime }); accumulated += fTime; }
                        if (accumulated >= totalMin) break
                        const bTime = Math.min(bDuration, totalMin - accumulated)
                        if (bTime > 0) { seq.push({ type: 'break', duration: bTime }); accumulated += bTime; }
                      }
                      timer.setMinutes(fDuration); timer.setSeconds(0)
                      timer.startSequence(seq, totalMin)
                      setIsBreakMode(false); setIsCustomTime(false)
                    }}
                    className="w-full py-1.5 bg-indigo-600 text-white rounded-lg text-[8px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/10 hover:bg-indigo-500 active:scale-95 transition-all"
                  >
                    🚀 Iniciar {Math.floor(totalTargetDuration/60)}h{totalTargetDuration%60 > 0 ? `${totalTargetDuration%60}m` : ""}
                  </button>
                </div>

                {/* Restored Presets Row */}
                <div className="w-full space-y-3">
                  <div className="flex items-center gap-2">
                    {PRESET_MINUTES.map((m) => (
                      <button
                        key={m}
                        onClick={() => handlePresetSelect(m)}
                        className={`flex-1 py-3 rounded-2xl text-xs font-bold transition-all border ${
                          timer.minutes === m && !isCustomTime && timer.sequence.length === 0
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                            : "bg-slate-800/40 border-slate-700/20 text-slate-500 hover:text-white hover:bg-slate-700/60"
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                    <button
                      onClick={() => setIsCustomTime(!isCustomTime)}
                      className={`px-4 py-3 rounded-2xl transition-all border ${
                        isCustomTime
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-slate-800/40 border-slate-700/20 text-slate-500 hover:text-white hover:bg-slate-700/60"
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isCustomTime && (
                  <div className="flex items-center gap-2 animate-scale-in bg-slate-800/20 px-4 py-2 rounded-2xl border border-slate-700/20">
                    <input
                      type="number"
                      value={timer.minutes}
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        if (!isNaN(val) && val >= 0 && val <= 180) {
                          timer.setMinutes(val)
                          if (!isBreakMode) setFocusDuration(prev => ({ ...prev, m: val }))
                          else setBreakDuration(prev => ({ ...prev, m: val }))
                        }
                      }}
                      className="w-10 bg-transparent text-center text-sm font-mono text-white outline-none"
                    />
                    <span className="text-slate-700 text-xs">:</span>
                    <input
                      type="number"
                      value={timer.seconds}
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        if (!isNaN(val) && val >= 0 && val < 60) {
                          timer.setSeconds(val)
                          if (!isBreakMode) setFocusDuration(prev => ({ ...prev, s: val }))
                          else setBreakDuration(prev => ({ ...prev, s: val }))
                        }
                      }}
                      className="w-10 bg-transparent text-center text-sm font-mono text-white outline-none"
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Quick Task Input while running */
              <form onSubmit={handleAddQuickTask} className="w-full max-w-sm animate-fade-in space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 group">
                    <input
                      type="text"
                      value={quickTask}
                      onChange={(e) => setQuickTask(e.target.value)}
                      placeholder="Añadir tarea rápida..."
                      className="w-full px-4 py-2.5 bg-slate-800/30 border border-slate-700/30 rounded-full text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition-all backdrop-blur-sm text-center"
                    />
                    {quickTask && (
                      <button 
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-500/20 animate-scale-in"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                   {(["S", "A", "B", "C"] as const).map(t => (
                     <button
                       key={t}
                       type="button"
                       onClick={() => setQuickTier(t)}
                       className={`w-7 h-7 rounded-full text-[10px] font-bold border flex items-center justify-center transition-all ${
                         quickTier === t 
                           ? t === "S" ? "bg-red-500 border-red-400 text-white" : "bg-indigo-500 border-indigo-400 text-white"
                           : "bg-slate-800/40 border-slate-700 text-slate-500 hover:text-slate-300"
                       }`}
                     >
                       {t}
                     </button>
                   ))}
                </div>
                
                <p className="text-[9px] text-slate-600 text-center uppercase tracking-widest font-bold opacity-40">
                  Tier {quickTier} · Pulsa Enter para guardar
                </p>
              </form>
            )}

            {/* Confirmation Flow Button */}
            {isWaitingConfirmation ? (
              <div className="w-full max-w-xs animate-bounce-slow">
                {timer.isJourneyFinished ? (
                   <div className="bg-emerald-600/20 border border-emerald-500/30 p-6 rounded-2xl text-center animate-scale-in">
                     <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                     <h3 className="text-lg font-bold text-emerald-300 uppercase tracking-wider">¡Éxito Total!</h3>
                     <p className="text-xs text-emerald-100/60 mb-4">Has completado tu jornada de {timer.totalTargetMinutes} minutos.</p>
                     <button
                       onClick={timer.reset}
                       className="w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
                     >
                       Finalizar Sesión
                     </button>
                   </div>
                ) : (
                  <button
                    onClick={handleConfirmTransition}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 transition-all active:scale-95"
                  >
                    <CheckCircle className="w-6 h-6" />
                    Confirmar {isBreakMode ? "Focus" : "Descanso"}
                  </button>
                )}
              </div>
            ) : (
              <TimerControls
                status={timer.status}
                onStart={() => {
                  timer.start(focusDuration.m, focusDuration.s)
                  setTaskStartTime(Date.now())
                }}
                onPause={timer.pause}
                onResume={timer.resume}
                onReset={handleStop}
              />
            )}

            {/* Collectibles Section (Only when idle) */}
            {!isTimerActive && (
              <div className="w-full max-w-md pt-6 border-t border-slate-800/50 animate-fade-in">
                 <AnimationSelector
                   animations={collectibles.animations}
                   currentSkin={collectibles.currentSkin}
                   onSelect={collectibles.setCurrentSkin}
                   totalMinutes={collectibles.totalFocusMinutes}
                   isUnlocked={collectibles.isUnlocked}
                 />
              </div>
            )}
          </div>
        )}

        {activeTab === "todos" && (
          <TodoList onSelect={(text, est, id, desc) => {
            setPendingTask({ id: id || Date.now().toString(), text, description: desc })
            setShowEstimationModal(true)
          }} />
        )}
        {activeTab === "habits" && <HabitTracker />}
        {activeTab === "goals" && <GoalsPanel />}

      </main>

      {/* Session info footer (Hidden during Zen Focus) */}
      {!isTimerActive && activeTab === "focus" && (
        <footer className="text-center py-4 text-xs text-slate-600 animate-fade-in relative z-10 flex flex-col gap-1">
          <p className="flex items-center justify-center gap-2">
            {isBreakMode ? "☕ Tiempo de descanso" : "🎯 Sesión de enfoque"} · {timer.minutes}m {timer.seconds > 0 ? `${timer.seconds}s` : ""}
          </p>
          <div className="flex items-center justify-center gap-1 opacity-50">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="uppercase tracking-[0.2em] font-medium text-[9px]">Skins desbloqueables activas</span>
          </div>
        </footer>
      )}
    </div>
  )
}
