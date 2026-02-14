"use client"

import { useState } from "react"
import { X, Trophy, Calendar, Flame, Target, Star, Activity, CheckCircle2, XCircle, ChevronLeft, ChevronRight, LayoutGrid, CalendarDays, Trash2, Bell, BellOff, Clock, MessageSquare, Play } from "lucide-react"
import { format, eachDayOfInterval, subDays, isSameDay, isAfter, startOfYear, endOfYear, differenceInDays, startOfMonth, endOfMonth, getDay, setYear, isBefore } from "date-fns"
import { es } from "date-fns/locale"

export type HabitCategory = "health" | "study" | "work" | "mindfulness" | "finance" | "social" | "other"

export interface Habit {
  id: string
  text: string
  category: HabitCategory
  streak: number
  lastChecked: string | null 
  history: string[]
  createdAt: string
  goalPerWeek?: number
  withNotification?: boolean
  notificationTime?: string // @deprecated use notificationTimes
  notificationTimes?: string[]
  customMessage?: string
}

interface HabitDetailModalProps {
  habit: Habit
  onClose: () => void
  onDelete: () => void
  onToggleToday: () => void
  onUpdate: (habit: Habit) => void
}

const CATEGORY_ICONS: Record<HabitCategory, any> = {
  health: Activity,
  study: Star,
  work: Target,
  mindfulness: Flame,
  finance: Trophy,
  social: Calendar,
  other: CheckCircle2
}

const CATEGORY_COLORS: Record<HabitCategory, string> = {
  health: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  study: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  work: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  mindfulness: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  finance: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  social: "text-pink-400 bg-pink-400/10 border-pink-400/20",
  other: "text-slate-400 bg-slate-400/10 border-slate-400/20"
}

export function HabitDetailModal({ habit, onClose, onDelete, onToggleToday, onUpdate }: HabitDetailModalProps) {
  const Icon = CATEGORY_ICONS[habit.category] || CheckCircle2
  const colorClass = CATEGORY_COLORS[habit.category] || CATEGORY_COLORS.other
  
  const [viewMode, setViewMode] = useState<'recent' | 'year'>('recent')
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  // Default to true if undefined
  const notificationsEnabled = habit.withNotification !== false

  const toggleNotifications = () => {
    onUpdate({ ...habit, withNotification: !notificationsEnabled })
  }

  const updateSettings = (key: keyof Habit, value: any) => {
    onUpdate({ ...habit, [key]: value })
  }

  const testNotification = () => {
    if (!("Notification" in window)) return
    if (Notification.permission !== "granted") {
      Notification.requestPermission()
      return
    }
    
    new Notification(habit.customMessage || "¡Recordatorio de Hábito! 🔥", {
      body: `Es hora de: ${habit.text}`,
      icon: '/favicon.ico',
    })
  }

  // Stats Calculations
  const today = new Date()
  const created = new Date(habit.createdAt)
  
  // Year Stats
  const yearStart = startOfYear(setYear(today, currentYear))
  const yearEnd = endOfYear(setYear(today, currentYear))
  const isCurrentYear = currentYear === today.getFullYear()
  
  // Filter history for selected year
  const daysInYearHistory = habit.history.filter(dateStr => {
     const d = new Date(dateStr)
     return d.getFullYear() === currentYear
  })
  
  const totalDaysInSelectedYear = differenceInDays(yearEnd, yearStart) + 1
  // If it's the current year, we might care about days *so far* or total year. 
  // For "Annual Success", let's use days passed so far in this year if it's current year.
  const daysPassedInYear = isCurrentYear ? differenceInDays(today, yearStart) + 1 : totalDaysInSelectedYear
  
  // Calculate success rate tailored to the year view
  const yearSuccessRate = Math.round((daysInYearHistory.length / daysPassedInYear) * 100) || 0
  const daysRemaining = isCurrentYear ? differenceInDays(yearEnd, today) : 0

  // Calendar Grid (Last 35 days)
  const recentDays = eachDayOfInterval({
    start: subDays(today, 34),
    end: today
  })

  // Determine status for each day
  const getDayStatus = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    const isCompleted = habit.history.includes(dateStr)
    const isFuture = isAfter(date, today)
    const isBeforeCreation = isBefore(date, created)
    
    // For visual clarity:
    // Future -> transparent/hidden
    // Before Creation -> neutral gray
    // Completed -> Green
    // Not Completed & Past & After Creation -> Red
    
    if (isFuture) return "future"
    if (isCompleted) return "success"
    if (isBeforeCreation) return "neutral"
    return "missed"
  }

  const renderMonth = (monthIndex: number) => {
    const monthStart = new Date(currentYear, monthIndex, 1)
    const monthEnd = endOfMonth(monthStart)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const startDayOfWeek = getDay(monthStart) // 0 (Sun) - 6 (Sat)
    // Adjust for Monday start if desired, but 0-6 is standard date-fns
    
    return (
      <div key={monthIndex} className="bg-slate-800/20 rounded-xl p-2 border border-slate-700/20">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2 text-center">
           {format(monthStart, "MMM", { locale: es })}
        </h4>
        <div className="grid grid-cols-7 gap-0.5">
           {/* Add empty placeholders for start of month alignment */}
           {Array.from({ length: startDayOfWeek }).map((_, i) => (
             <div key={`empty-${i}`} className="w-full aspect-square" />
           ))}
           {days.map(day => {
              const status = getDayStatus(day)
              return (
                <div 
                  key={day.toISOString()}
                  className={`w-full aspect-square rounded-sm transition-all ${
                     status === "success" ? "bg-emerald-500" :
                     status === "missed" ? "bg-red-500/40" :
                     status === "neutral" ? "bg-slate-700/30" :
                     "bg-slate-800/10 opacity-0" // Future
                  }`}
                  title={format(day, "d MMM yyyy", { locale: es })}
                />
              )
           })}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-slate-950/80 backdrop-blur-sm animate-fade-in text-slate-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[70vh]">
        
        {/* Header */}
        <div className="relative p-5 border-b border-slate-800/50 bg-slate-900/50 shrink-0">
          <button 
            onClick={onClose}
            className="absolute right-3 top-3 p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4 pr-10">
            <div className={`p-2.5 rounded-2xl ${colorClass}`}>
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase font-black tracking-widest ${colorClass}`}>
                  {habit.category}
                </div>
                {/* Notification Toggle */}
                <button
                  onClick={toggleNotifications}
                  className={`p-1 rounded-full transition-all ${notificationsEnabled ? "text-indigo-400 bg-indigo-400/10" : "text-slate-600 hover:text-slate-400"}`}
                  title={notificationsEnabled ? "Notificaciones activadas" : "Notificaciones desactivadas"}
                >
                  {notificationsEnabled ? <Bell className="w-3 h-3 block" /> : <BellOff className="w-3 h-3 block" />}
                </button>
              </div>
              <h2 className="text-xl font-bold text-white leading-tight">{habit.text}</h2>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">
          
          {/* Custom Notification Settings */}
          {notificationsEnabled && (
            <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                   <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Bell className="w-3 h-3" /> Configuración Alerta
                   </h4>
                   <button onClick={testNotification} className="text-[9px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-white flex items-center gap-1">
                      <Play className="w-2.5 h-2.5" /> Probar
                   </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                   <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1">HORA</label>
                      <div className="relative">
                        <Clock className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
                        <input 
                           type="time" 
                           value={habit.notificationTime || ""}
                           onChange={(e) => updateSettings('notificationTime', e.target.value)}
                           className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 pl-7 pr-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                           placeholder="Global"
                        />
                      </div>
                   </div>
                   <div>
                      <label className="text-[9px] text-slate-500 font-bold block mb-1">MENSAJE</label>
                      <div className="relative">
                        <MessageSquare className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
                        <input 
                           type="text" 
                           value={habit.customMessage || ""}
                           onChange={(e) => updateSettings('customMessage', e.target.value)}
                           className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 pl-7 pr-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                           placeholder="Por defecto"
                        />
                      </div>
                   </div>
                </div>
            </div>
          )}

          {/* Main Stats (Context Aware) */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30 flex flex-col items-center justify-center gap-1">
                <Flame className={`w-8 h-8 ${habit.streak > 0 ? "text-orange-500 animate-pulse" : "text-slate-600"}`} />
                <span className="text-2xl font-black text-white">{habit.streak}</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Racha Actual</span>
             </div>
             <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30 flex flex-col items-center justify-center gap-1">
                <Trophy className={`w-8 h-8 ${yearSuccessRate > 80 ? "text-yellow-400" : "text-slate-600"}`} />
                <span className="text-2xl font-black text-white">{yearSuccessRate}%</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                   {viewMode === 'recent' ? 'Éxito ' + currentYear : `Éxito ${currentYear}`}
                </span>
             </div>
          </div>

          {/* Calendar Header Control */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> 
              {viewMode === 'recent' ? 'Últimos 35 días' : `Calendario ${currentYear}`}
            </h3>
            
            <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
               <button 
                 onClick={() => setViewMode('recent')}
                 className={`p-1.5 rounded-md transition-all ${viewMode === 'recent' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                 title="Vista Reciente"
               >
                 <LayoutGrid className="w-4 h-4" />
               </button>
               <button 
                 onClick={() => setViewMode('year')}
                 className={`p-1.5 rounded-md transition-all ${viewMode === 'year' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                 title="Vista Anual"
               >
                 <CalendarDays className="w-4 h-4" />
               </button>
            </div>
          </div>

          {/* RECENT VIEW */}
          {viewMode === 'recent' && (
            <div className="animate-fade-in space-y-4">
               <div className="grid grid-cols-7 gap-2">
                 {recentDays.map((day) => {
                   const status = getDayStatus(day)
                   return (
                     <div key={day.toISOString()} className="flex flex-col items-center gap-1">
                        <span className="text-[9px] text-slate-600 font-mono">{format(day, "d")}</span>
                        <div 
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            status === "success" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" :
                            status === "missed" ? "bg-red-500/10 border border-red-500/20 text-red-500" :
                            status === "neutral" ? "bg-slate-800/50 border border-slate-700/30 opacity-50" :
                            "bg-transparent border border-slate-800 opacity-20"
                          }`}
                        >
                           {status === "success" && <CheckCircle2 className="w-4 h-4" />}
                           {status === "missed" && <XCircle className="w-4 h-4" />}
                        </div>
                     </div>
                   )
                 })}
               </div>
               <div className="flex justify-between items-center px-2">
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                     <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Hecho</span>
                     <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500/50" /> Fallo</span>
                     <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-700" /> Previo</span>
                  </div>
               </div>
            </div>
          )}

          {/* ANNUAL VIEW */}
          {viewMode === 'year' && (
            <div className="animate-fade-in space-y-4">
               {/* Year Navigation */}
               <div className="flex items-center justify-between bg-slate-800/20 rounded-xl p-2 border border-slate-700/20">
                  <button onClick={() => setCurrentYear(y => y - 1)} className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-sm font-black text-white">{currentYear}</span>
                  <button onClick={() => setCurrentYear(y => y + 1)} className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"><ChevronRight className="w-4 h-4" /></button>
               </div>

               {/* 12 Month Grid */}
               <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 12 }).map((_, i) => renderMonth(i))}
               </div>
               
               {/* Yearly Stats Summary */}
               <div className="bg-slate-800/20 rounded-2xl p-4 border border-slate-700/30 space-y-3">
                  <div className="flex justify-between items-center">
                     <span className="text-xs text-slate-400 font-medium">Progreso {currentYear}</span>
                     <span className="text-sm font-bold text-white font-mono">{daysInYearHistory.length} días</span>
                  </div>
                  {isCurrentYear && (
                    <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-60">
                       <span>Restan {daysRemaining} días</span>
                    </div>
                  )}
               </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-3 shrink-0">
           <button
             onClick={onToggleToday}
             className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
               habit.lastChecked === format(today, "yyyy-MM-dd")
                 ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
                 : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
             }`}
           >
             {habit.lastChecked === format(today, "yyyy-MM-dd") ? "Desmarcar Hoy" : "Completar Hoy"}
           </button>
           
           <button
             onClick={onDelete}
             className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"
           >
             <div className="w-5 h-5 flex items-center justify-center">
               <span className="sr-only">Eliminar</span>
               <Trash2 className="w-4.5 h-4.5" />
             </div>
           </button>
        </div>

      </div>
    </div>
  )
}
