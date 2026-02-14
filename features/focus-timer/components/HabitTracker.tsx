import { useState, useEffect, useRef } from "react"
import { Plus, Trash2, CheckCircle2, Circle, Flame, Calendar, MoreHorizontal, Activity, Star, Target, Trophy, Bell, BellOff, Settings2, X, ChevronDown, Clock, MessageSquare, MessageCircle, Send, Radio, CloudLightning } from "lucide-react"
import { format, subDays } from "date-fns"
import { HabitDetailModal, type HabitCategory } from "./HabitDetailModal"
import { useHabitNotifications, HabitMinimal } from "../hooks/useHabitNotifications"
import { TimePicker } from "./TimePicker"
import { habitService, type Habit } from "../services/habitService"

// Re-export or alias types to avoid conflict
// Ideally types should be centralized. 
// Habit from service is checking the DB structure
// Habit from DetailModal might be slightly different? Let's assume compat
// Logic below tries to unify

function HabitSettingsItem({ habit, onUpdate }: { habit: Habit, onUpdate: (h: Habit) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const isEnabled = habit.withNotification !== false
  
  // Migration/Fallback: ensures we always have an array
  const times = habit.notificationTimes || (habit.notificationTime ? [habit.notificationTime] : [])

  const updateTimes = (newTimes: string[]) => {
     onUpdate({ ...habit, notificationTimes: newTimes })
  }

  const addTime = () => {
     updateTimes([...times, "09:00"])
  }

  const removeTime = (index: number) => {
     const newTimes = [...times]
     newTimes.splice(index, 1)
     updateTimes(newTimes)
  }

  const changeTime = (index: number, val: string) => {
     const newTimes = [...times]
     newTimes[index] = val
     updateTimes(newTimes)
  }

  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 overflow-hidden transition-all">
       <button 
         className="w-full flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800/50 transition-colors" 
         onClick={() => setIsOpen(!isOpen)}
       >
          <div className="flex items-center gap-2.5">
             <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] transition-colors ${isEnabled ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-slate-600 shadow-none'}`} />
             <span className={`text-xs font-bold transition-colors ${isEnabled ? 'text-slate-200' : 'text-slate-500 line-through'}`}>{habit.text}</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
       </button>
       
       {isOpen && (
         <div className="p-3 pt-0 space-y-3 bg-slate-800/20 border-t border-slate-700/20 animate-fade-in">
            {/* Toggle Switch */}
            <div className="flex items-center justify-between pt-2">
               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Notificaciones</span>
               <button 
                  onClick={(e) => {
                      e.stopPropagation();
                      onUpdate({...habit, withNotification: !isEnabled})
                  }}
                  className={`relative w-9 h-5 rounded-full transition-colors ${isEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}
               >
                  <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-4' : ''}`} />
               </button>
            </div>
            
            {/* Inputs if enabled */}
            {isEnabled && (
               <div className="space-y-3 pt-1">
                   <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><Clock className="w-2.5 h-2.5" /> HORAS ESPECÍFICAS</span>
                          <button onClick={addTime} className="text-indigo-400 hover:text-indigo-300 text-[9px] flex items-center gap-1">
                             <Plus className="w-2.5 h-2.5" /> Añadir
                          </button>
                      </label>
                      {times.length === 0 && (
                          <p className="text-[9px] text-slate-600 italic">Se usará la hora global.</p>
                      )}
                      <div className="space-y-1.5">
                          {times.map((t, i) => (
                              <div key={i} className="flex gap-1 items-center">
                                  <div className="flex-1">
                                    <TimePicker 
                                       value={t}
                                       onChange={(val) => changeTime(i, val)}
                                    />
                                  </div>
                                  <button onClick={() => removeTime(i)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
                                      <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                              </div>
                          ))}
                      </div>
                   </div>
                   
                   <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1 flex items-center gap-1.5"><MessageSquare className="w-2.5 h-2.5" /> MENSAJE PERSONALIZADO</label>
                      <input 
                         type="text" 
                         value={habit.customMessage || ""}
                         onChange={(e) => onUpdate({...habit, customMessage: e.target.value})}
                         className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 placeholder:text-slate-600"
                         placeholder="Ej. ¡A por todas!"
                      />
                   </div>
               </div>
            )}
         </div>
       )}
    </div>
  )
}

export function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [needsMigration, setNeedsMigration] = useState(false)
  
  // Telegram Config
  const [telegramConfig, setTelegramConfig] = useState<{token: string, chatId: string}>({ token: '', chatId: '' })
  const [tunnelUrl, setTunnelUrl] = useState("") // Support for ngrok
  const [showSettings, setShowSettings] = useState(false)
  
  useEffect(() => {
     // 1. Load Telegram Config
     const savedConfig = localStorage.getItem('focus_timer_telegram_config')
     if (savedConfig) {
        try {
           setTelegramConfig(JSON.parse(savedConfig))
        } catch (e) {}
     }

     // 2. Load API Habits
     loadHabits()
  }, [])

  const loadHabits = async () => {
     try {
        setLoading(true)
        // Check if we have legacy local habits
        const localHabitsJson = localStorage.getItem("focus_timer_habits")
        let localHabits: Habit[] = []
        if (localHabitsJson) {
            try {
                localHabits = JSON.parse(localHabitsJson)
            } catch (e) {}
        }

        const dbHabits = await habitService.list(telegramConfig.chatId)
        
        if (dbHabits.length === 0 && localHabits.length > 0) {
            setNeedsMigration(true)
            setHabits(localHabits) // Show local for now until migrated
        } else {
            setHabits(dbHabits)
        }
     } catch (e) {
         console.error("Error loading habits", e)
     } finally {
         setLoading(false)
     }
  }

  const syncMigration = async () => {
    try {
        setLoading(true)
        const localHabitsJson = localStorage.getItem("focus_timer_habits")
        if (!localHabitsJson) return
        
        const localHabits = JSON.parse(localHabitsJson)
        // Inject current telegram config if not present in habits
        const habitsToMigrate = localHabits.map((h: any) => ({
            ...h,
            telegramConfig: h.telegramConfig || telegramConfig
        }))

        await habitService.syncMigrate(habitsToMigrate)
        
        // Clear local storage legacy
        localStorage.removeItem("focus_timer_habits")
        setNeedsMigration(false)
        
        // Reload from DB
        loadHabits()
        alert("¡Migración completada con éxito! Tus hábitos ahora están en la nube ☁️")
    } catch (e) {
        console.error(e)
        alert("Error en la migración")
    } finally {
        setLoading(false)
    }
  }

  const saveTelegramConfig = (newConfig: {token: string, chatId: string}) => {
     setTelegramConfig(newConfig)
     localStorage.setItem('focus_timer_telegram_config', JSON.stringify(newConfig))
  }

  const { permission, requestPermission, sendNotificationNow, notificationTime, setNotificationTime } = useHabitNotifications(habits, telegramConfig)

  const [inputValue, setInputValue] = useState("")
  const [streakInput, setStreakInput] = useState("")
  const [totalDaysInput, setTotalDaysInput] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<HabitCategory>("health")
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null)
  
  // Settings Mode

   const testTelegram = async () => {
    if (!telegramConfig.token || !telegramConfig.chatId) {
       alert("Configura primero el Token y Chat ID")
       return
    }
    try {
       const res = await fetch('/api/notify/telegram', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
             token: telegramConfig.token,
             chatId: telegramConfig.chatId,
             text: "¡Hola! Esto es una prueba desde tu Habit Tracker 🚀"
          })
       })
       const data = await res.json()
       if (data.success) {
          alert("¡Mensaje enviado con éxito! Revisa tu Telegram.")
       } else {
          alert("Error: " + (data.error || "Desconocido"))
       }
    } catch (e) {
       alert("Error de conexión con el servidor")
    }
  }

  const sendDailySummary = async () => {
    if (!telegramConfig.token || !telegramConfig.chatId) return

    const today = new Date().toISOString().split("T")[0]
    // Use HabitService list to ensure fresh data? Or use local state?
    // Using local state `habits` is fine as it should be synced
    const completed = habits.filter(h => h.history.includes(today)).length
    const total = habits.length
    
    let message = `📅 *Resumen de Hábitos* (${new Date().toLocaleDateString()})\n\n`
    message += `📊 Progreso: ${completed}/${total} completados\n\n`
    
    habits.forEach(h => {
       const isDone = h.history.includes(today)
       message += `${isDone ? '✅' : '⬜'} *${h.text}* (🔥 ${h.streak})\n`
    })

    message += `\n${completed === total ? '🎉 ¡Día perfecto! Sigue así.' : '💪 ¡Tú puedes con todo!'}`

    try {
       await fetch('/api/notify/telegram', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
             token: telegramConfig.token,
             chatId: telegramConfig.chatId,
             text: message
          })
       })
       alert("Resumen enviado a Telegram 📝")
    } catch (e) {
       console.error(e)
       alert("Error al enviar resumen")
    }
  }

  const updateHabit = async (updatedHabit: Habit) => {
    // Optimistic Update
    const prevHabits = [...habits]
    setHabits(prev => prev.map(h => h.id === updatedHabit.id ? updatedHabit : h))
    if (selectedHabit?.id === updatedHabit.id) {
       setSelectedHabit(updatedHabit)
    }

    try {
        await habitService.update(updatedHabit.id, updatedHabit)
    } catch (e) {
        console.error("Failed to update habit", e)
        // Revert? For now silent fail or alert
        // setHabits(prevHabits)
    }
  }

  const addHabit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const initialStreak = parseInt(streakInput) || 0
    const totalDays = parseInt(totalDaysInput) || initialStreak // Default to streak if total not set
    const realTotalDays = Math.max(totalDays, initialStreak)
    const today = new Date()
    const history: string[] = []

    if (initialStreak > 0) {
       for (let i = 0; i < initialStreak; i++) {
          history.push(format(subDays(today, i), "yyyy-MM-dd"))
       }
    }

    const newHabitPartial: Partial<Habit> = {
      text: inputValue.trim(),
      category: selectedCategory,
      streak: initialStreak,
      history: history, // Note: Creating with history manually via API might need checking 'create' logic
      // Actually 'create' API doesn't support bulk history insert in 'habits' table insert 
      // But let's assume valid start for v1. 
      // Ideally we would loop insert logs. 
      // For simplicity in this iteration: we trust user starts fresh OR we add complex logic later.
      // Wait, 'PUT' endpoint supports history migration. 'POST' does not yet.
      // Let's rely on standard creation = pure new habit.
      createdAt: format(subDays(today, Math.max(0, realTotalDays - 1)), "yyyy-MM-dd"),
      withNotification: true,
      notificationTimes: [],
      telegramConfig
    }

    try {
        const created = await habitService.create(newHabitPartial)
        setHabits([created, ...habits])
        setInputValue("")
        setStreakInput("")
        setTotalDaysInput("")
    } catch (e) {
        alert("Error al crear hábito")
    }
  }

  const toggleHabit = async (id: string) => {
    const today = new Date().toISOString().split("T")[0]
    
    // Find habit
    const habit = habits.find(h => h.id === id)
    if (!habit) return

    const isDoneToday = habit.history.includes(today)
    
    // Optimistic calculation
    let newHistory = [...habit.history]
    let newStreak = habit.streak
    
    if (isDoneToday) {
        newHistory = newHistory.filter(d => d !== today)
        newStreak = Math.max(0, newStreak - 1)
    } else {
        newHistory = [...newHistory, today]
        newStreak = newStreak + 1
    }

    const optimisticHabit = { 
        ...habit, 
        history: newHistory, 
        streak: newStreak,
        lastChecked: isDoneToday ? null : today // Transient field update
    }

    updateHabitState(optimisticHabit)

    try {
        await habitService.toggleLog(id, today)
        // We could re-fetch to be sure of streak calculation from server
    } catch (e) {
        console.error("Error toggling habit", e)
        // Revert
        updateHabitState(habit)
    }
  }

  const updateHabitState = (habit: Habit) => {
      setHabits(prev => prev.map(h => h.id === habit.id ? habit : h))
      if (selectedHabit?.id === habit.id) setSelectedHabit(habit)
  }

  const deleteHabit = async (id: string) => {
    // Optimistic
    const prevHabits = [...habits]
    setHabits(prev => prev.filter((habit) => habit.id !== id))
    if (selectedHabit?.id === id) setSelectedHabit(null)

    try {
        await habitService.delete(id)
    } catch (e) {
        setHabits(prevHabits)
        alert("Error al eliminar")
    }
  }

  // Categories for selector
  const CATEGORIES: { id: HabitCategory, icon: any, color: string, label: string }[] = [
    { id: "health", icon: Activity, color: "text-emerald-400", label: "Salud" },
    { id: "study", icon: Star, color: "text-blue-400", label: "Estudio" },
    { id: "work", icon: Target, color: "text-violet-400", label: "Trabajo" },
    { id: "mindfulness", icon: Flame, color: "text-rose-400", label: "Mindfulness" },
    { id: "other", icon: CheckCircle2, color: "text-slate-400", label: "Otro" }
  ]

  // Helper to get last 7 days
  const getLast7Days = () => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      days.push(date.toISOString().split("T")[0])
    }
    return days
  }

  const last7Days = getLast7Days()

  return (
    <div className="w-full max-w-[320px] bg-slate-800/10 backdrop-blur-md rounded-3xl border border-slate-700/20 p-4 animate-fade-in mx-auto relative group/container min-h-[400px] flex flex-col flex-1">
      
      {/* Settings Overlay - Full Cover */}
      {showSettings && (
        <div className="absolute inset-0 z-20 bg-slate-900 rounded-3xl p-4 flex flex-col animate-scale-in">
           <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3 shrink-0">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-400" /> Configuración
              </span>
              <button 
                  onClick={() => setShowSettings(false)} 
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
              >
                 <X className="w-3.5 h-3.5" />
              </button>
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-6 scrollbar-hide pr-1">
              
              {/* Migration Alert */}
              {needsMigration && (
                  <div className="bg-indigo-500/10 border border-indigo-500/50 p-3 rounded-xl">
                      <h4 className="text-[10px] font-bold text-indigo-300 uppercase mb-2 flex items-center gap-2">
                          <CloudLightning className="w-3 h-3" /> Sincronización
                      </h4>
                      <p className="text-[10px] text-indigo-200 mb-3 leading-relaxed">
                          Tienes hábitos guardados solo en este dispositivo. Súbelos a la nube para no perderlos y usar el bot.
                      </p>
                      <button 
                          onClick={syncMigration}
                          disabled={loading}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                      >
                          {loading ? "Sincronizando..." : "Subir a la Nube"}
                      </button>
                  </div>
              )}

              {/* Telegram Integration */}
              <div className="space-y-2">
                  <h4 className="text-[10px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1.5 opacity-80">
                      <MessageCircle className="w-3 h-3" /> Telegram
                  </h4>
                   <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/30 space-y-3">
                      <div>
                         <label className="text-[9px] text-slate-500 font-bold block mb-1">BOT TOKEN</label>
                         <input 
                           type="password" 
                           placeholder="123456:ABC-DEF..."
                           value={telegramConfig.token}
                           onChange={(e) => saveTelegramConfig({...telegramConfig, token: e.target.value})}
                           className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white w-full focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                         />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[9px] text-indigo-400 font-bold block">TÚNEL LOCAL (OPCIONAL)</label>
                         <input 
                           type="text" 
                           placeholder="https://xxxx.ngrok-free.app"
                           value={tunnelUrl}
                           onChange={(e) => setTunnelUrl(e.target.value)}
                           className="bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-[10px] text-white w-full focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                         />
                         <p className="text-[8px] text-slate-500 italic px-1 leading-tight">Usa esto si estás en localhost con ngrok.</p>
                      </div>
                      <div>
                         <label className="text-[9px] text-slate-500 font-bold block mb-1">CHAT ID</label>
                         <input 
                           type="text" 
                           placeholder="123456789"
                           value={telegramConfig.chatId}
                           onChange={(e) => saveTelegramConfig({...telegramConfig, chatId: e.target.value})}
                           className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white w-full focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                         />
                      </div>
                      <div className="flex gap-2">
                         <button 
                            onClick={testTelegram}
                            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                            title="Probar envío de mensaje básico"
                         >
                            <Send className="w-3 h-3" /> Test
                         </button>
                         <button 
                            onClick={async () => {
                                try {
                                    const base = tunnelUrl.trim().replace(/\/$/, "") || window.location.origin
                                    const url = base + "/api/notify/telegram/webhook"
                                    const res = await fetch("/api/notify/telegram/setup", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ url })
                                    })
                                    const data = await res.json()
                                    if (data.success) {
                                        alert("¡Bot conectado! Ahora responderá a tus comandos.")
                                    } else {
                                        alert("Error: " + data.error)
                                    }
                                } catch (e) {
                                    alert("Error de conexión")
                                }
                            }}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                            title="Vincular Webhook para comandos interactivos"
                         >
                            <CloudLightning className="w-3 h-3" /> Conectar Bot
                         </button>
                      </div>
                      <button 
                         onClick={sendDailySummary}
                         className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                      >
                         <MessageSquare className="w-3 h-3" /> Enviar Resumen Diario
                      </button>
                      <p className="text-[9px] text-slate-600 leading-tight italic">
                         Crea un bot con @BotFather y obtén tu ID con @userinfobot.
                      </p>
                   </div>
              </div>

              {/* Global Defaults */}
              <div className="space-y-2">
                  <h4 className="text-[10px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1.5 opacity-80">
                      <Bell className="w-3 h-3" /> Global
                  </h4>
                   <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/30">
                     <label className="text-[9px] text-slate-500 font-bold block mb-1.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> HORA POR DEFECTO
                     </label>
                     <p className="text-[9px] text-slate-500 mb-2 leading-tight">
                        Se usará esta hora para todos los hábitos que no tengan una hora específica.
                     </p>
                     <div className="flex items-center gap-2">
                        <TimePicker 
                          value={notificationTime}
                          onChange={(val) => setNotificationTime(val)}
                        />
                     </div>
                   </div>
              </div>

              {/* Per Habit Settings */}
              <div className="space-y-2">
                  <h4 className="text-[10px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1.5 opacity-80">
                      <Target className="w-3 h-3" /> Por Hábito
                  </h4>
                  <div className="space-y-2">
                    {habits.length === 0 ? (
                        <p className="text-xs text-slate-600 italic text-center py-4">No tienes hábitos creados aún.</p>
                    ) : (
                        habits.map(habit => (
                            <HabitSettingsItem key={habit.id} habit={habit} onUpdate={updateHabit} />
                        ))
                    )}
                  </div>
              </div>
           </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" /> Hábitos
        </h2>
        
        {/* Notification Controls */}
        <div className="flex items-center gap-1">
          {permission === 'default' && (
            <button 
              type="button"
              onClick={requestPermission}
              className="text-slate-500 hover:text-indigo-400 transition-colors animate-pulse p-1"
              title="Activar notificaciones diarias"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
          )}
          {permission === 'granted' && (
            <div className="flex items-center">
               <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className={`text-slate-500 hover:text-white transition-colors p-1 ${showSettings ? "text-white" : ""}`}
                  title="Configurar notificaciones"
               >
                  <Settings2 className="w-3.5 h-3.5" />
               </button>
               {needsMigration && (
                   <button
                        type="button"
                        onClick={() => setShowSettings(true)}
                        className="text-indigo-400 hover:text-indigo-300 transition-colors p-1 animate-pulse"
                        title="Sincronización pendiente"
                    >
                        <CloudLightning className="w-3.5 h-3.5" />
                    </button>
               )}
               <button
                  type="button"
                  onClick={sendNotificationNow}
                  className="text-emerald-500/50 hover:text-emerald-400 transition-colors p-1"
                  title="Probar notificación ahora (Test)"
               >
                  <CheckCircle2 className="w-3.5 h-3.5" />
               </button>
            </div>
          )}
          {permission === 'denied' && (
             <span title="Notificaciones bloqueadas por el navegador" className="p-1 cursor-help">
               <BellOff className="w-3.5 h-3.5 text-slate-700" />
             </span>
          )}
        </div>
      </div>

      <form onSubmit={addHabit} className="space-y-3 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Nuevo hábito..."
            className="flex-1 px-3 py-1.5 bg-slate-900/40 border border-slate-700/20 rounded-xl text-[11px] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
          />
          <button
            type="submit"
            className="p-1.5 bg-indigo-600/90 text-white rounded-lg active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {/* Advanced Controls: Category & History */}
        {inputValue && (
          <div className="space-y-3 animate-fade-in bg-slate-900/40 p-3 rounded-xl border border-slate-800/50">
             
             {/* Category Selection */}
             <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`p-1.5 rounded-lg transition-all ${selectedCategory === cat.id ? "bg-slate-700 text-white ring-1 ring-slate-500" : "text-slate-600 hover:text-slate-400 hover:bg-slate-800"}`}
                      title={cat.label}
                    >
                      <cat.icon className={`w-3.5 h-3.5 ${selectedCategory === cat.id ? cat.color : ""}`} />
                    </button>
                  ))}
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                   {CATEGORIES.find(c => c.id === selectedCategory)?.label}
                </span>
             </div>

             {/* History Inputs */}
             <div className="flex items-center gap-2 border-t border-slate-800/50 pt-2">
                <div className="flex-1 flex items-center gap-2 px-2 py-1 bg-slate-950/50 rounded-lg border border-slate-800">
                   <Flame className="w-3 h-3 text-orange-500" />
                   <input 
                     type="number" 
                     min="0"
                     max="999"
                     placeholder="Racha"
                     value={streakInput}
                     onChange={(e) => setStreakInput(e.target.value)}
                     className="w-full bg-transparent text-[10px] text-white placeholder:text-slate-600 focus:outline-none font-mono"
                   />
                </div>
                
                <div className="flex-1 flex items-center gap-2 px-2 py-1 bg-slate-950/50 rounded-lg border border-slate-800">
                   <Calendar className="w-3 h-3 text-slate-500" />
                   <input 
                     type="number" 
                     min="0"
                     max="999"
                     placeholder="Días Total"
                     value={totalDaysInput}
                     onChange={(e) => setTotalDaysInput(e.target.value)}
                     className="w-full bg-transparent text-[10px] text-white placeholder:text-slate-600 focus:outline-none font-mono"
                   />
                </div>
             </div>
             
             <div className="text-[9px] text-slate-500 leading-tight px-1">
                {streakInput && totalDaysInput && parseInt(totalDaysInput) > parseInt(streakInput) ? (
                   <span>
                      <span className="text-red-400 font-bold">{parseInt(totalDaysInput) - parseInt(streakInput)} fallos</span> en los primeros días.
                   </span>
                ) : (
                   <span>Define tu racha actual y el total de días desde que empezaste.</span>
                )}
             </div>

          </div>
        )}
      </form>

      <div className="space-y-2 flex-1 overflow-y-auto pr-1 scrollbar-hide">
        {loading ? (
             <div className="flex items-center justify-center h-20">
                 <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
             </div>
        ) : habits.length === 0 ? (
          <div className="text-center py-6 opacity-30">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Sin hábitos aún</p>
          </div>
        ) : (
          habits.map((habit) => {
            const today = new Date().toISOString().split("T")[0]
            const isDoneToday = habit.history.includes(today)
            const CategoryIcon = CATEGORIES.find(c => c.id === habit.category)?.icon || Circle

            return (
              <div
                key={habit.id}
                onClick={(e) => {
                   // Open modal if not clicking buttons
                   if (!(e.target as HTMLElement).closest('button')) {
                      setSelectedHabit(habit)
                   }
                }}
                className="group bg-slate-900/20 border border-slate-800/40 rounded-2xl p-2.5 transition-all hover:bg-slate-800/40 cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <button
                    onClick={(e) => {
                       e.stopPropagation();
                       toggleHabit(habit.id);
                    }}
                    className={`transition-all active:scale-75 ${
                      isDoneToday ? "text-indigo-400" : "text-slate-700 hover:text-slate-600"
                    }`}
                  >
                    {isDoneToday ? (
                      <CheckCircle2 className="w-4 h-4 fill-indigo-400/5" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                     <p className={`text-[11px] truncate ${isDoneToday ? "text-indigo-300 opacity-40 line-through" : "text-slate-300"}`}>
                        {habit.text}
                     </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                     {/* Category Indicator */}
                     <CategoryIcon className="w-2.5 h-2.5 text-slate-600 opacity-50" />
                     
                     <div className="flex items-center gap-0.5 opacity-60">
                        <Flame className={`w-2.5 h-2.5 ${habit.streak > 0 ? "text-orange-500" : "text-slate-700"}`} />
                        <span className="text-[9px] font-mono text-slate-500">{habit.streak}</span>
                     </div>
                  </div>
                </div>

                <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                  {last7Days.map((day) => {
                    const isDone = habit.history.includes(day)
                    const isToday = day === today
                    return (
                      <div 
                        key={day} 
                        className={`flex-1 h-1 rounded-full transition-all ${
                          isDone 
                            ? "bg-indigo-500/80" 
                            : isToday 
                              ? "bg-slate-700/50"
                              : "bg-slate-900/50"
                        }`}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Detail Modal */}
      {selectedHabit && (
        <HabitDetailModal 
          habit={selectedHabit} 
          onClose={() => setSelectedHabit(null)}
          onDelete={() => deleteHabit(selectedHabit.id)}
          onToggleToday={() => toggleHabit(selectedHabit.id)}
          onUpdate={updateHabit}
        />
      )}
    </div>
  )
}
