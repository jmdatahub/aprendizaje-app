"use client"

import { useState, useEffect } from "react"
import { Zap, Trophy, TrendingUp, HelpCircle } from "lucide-react"

export function BoostPanel() {
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalMinutes: 0,
    todaySessions: 0,
  })

  useEffect(() => {
    // In a real app, these would be calculated from a history log
    // For this prototype, we'll use simple counters in localStorage
    const savedStats = localStorage.getItem("focus_timer_stats")
    if (savedStats) {
      setStats(JSON.parse(savedStats))
    }
  }, [])

  const tips = [
    "La técnica Pomodoro ayuda a mantener la frescura mental.",
    "El descanso es tan importante como el trabajo profundo.",
    "Beber agua entre sesiones mejora la concentración.",
    "Elimina distracciones visuales antes de empezar tu timer.",
    "Una meta clara es el 50% del éxito en una sesión de Focus.",
  ]

  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    setTipIndex(Math.floor(Math.random() * tips.length))
  }, [])

  return (
    <div className="w-full max-w-md space-y-4 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-indigo-600/20 border border-indigo-500/30 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-300">Total</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{stats.totalSessions}</span>
            <span className="text-xs text-indigo-300/60 font-medium">sesiones</span>
          </div>
        </div>

        <div className="bg-emerald-600/20 border border-emerald-500/30 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-300">Hoy</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{stats.todaySessions}</span>
            <span className="text-xs text-emerald-300/60 font-medium">sesiones</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/20 border border-slate-700/50 p-4 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Tiempo Total</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}m</span>
        </div>
      </div>

      {/* Motivational Tip */}
      <div className="bg-indigo-900/40 border border-indigo-500/20 p-6 rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
          <HelpCircle className="w-12 h-12 text-indigo-400 -rotate-12" />
        </div>
        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Focus Tip</h3>
        <p className="text-sm text-indigo-100 leading-relaxed font-medium italic relative z-10">
          "{tips[tipIndex]}"
        </p>
      </div>

      <p className="text-[10px] text-center text-slate-600 font-medium uppercase tracking-widest pt-2">
        Sigue así, estás desbloqueando tu potencial 🚀
      </p>
    </div>
  )
}
