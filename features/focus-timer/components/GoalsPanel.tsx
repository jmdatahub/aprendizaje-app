"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Target, TrendingUp } from "lucide-react"

interface Goal {
  id: string
  text: string
  current: number
  target: number
}

export function GoalsPanel() {
  const [goals, setGoals] = useState<Goal[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("focus_timer_goals")
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error("Failed to parse goals", e)
        }
      }
    }
    return []
  })
  const [isAdding, setIsAdding] = useState(false)
  const [newGoal, setNewGoal] = useState({ text: "", target: 10 })

  useEffect(() => {
    localStorage.setItem("focus_timer_goals", JSON.stringify(goals))
  }, [goals])

  const addGoal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGoal.text.trim() || newGoal.target <= 0) return
    const goal: Goal = {
      id: Date.now().toString(),
      text: newGoal.text.trim(),
      current: 0,
      target: newGoal.target,
    }
    setGoals([goal, ...goals])
    setNewGoal({ text: "", target: 10 })
    setIsAdding(false)
  }

  const updateProgress = (id: string, delta: number) => {
    setGoals(
      goals.map((goal) => {
        if (goal.id === id) {
          const newCurrent = Math.min(goal.target, Math.max(0, goal.current + delta))
          return { ...goal, current: newCurrent }
        }
        return goal
      })
    )
  }

  const deleteGoal = (id: string) => {
    setGoals(goals.filter((goal) => goal.id !== id))
  }

  return (
    <div className="w-full max-w-md bg-slate-800/20 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="text-indigo-400">🎯</span> Objetivos
        </h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 rounded-lg transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={addGoal} className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/30 mb-6 space-y-3 animate-scale-in">
          <input
            type="text"
            value={newGoal.text}
            onChange={(e) => setNewGoal({ ...newGoal, text: e.target.value })}
            placeholder="Título del objetivo..."
            className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 uppercase mb-1 block tracking-wider">Meta (ej: 10 horas)</label>
              <input
                type="number"
                value={newGoal.target}
                onChange={(e) => setNewGoal({ ...newGoal, target: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-all"
            >
              Añadir
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-lg transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
        {goals.length === 0 && !isAdding ? (
          <p className="text-slate-500 text-center py-8 italic">No has definido objetivos aún</p>
        ) : (
          goals.map((goal) => {
            const percentage = (goal.current / goal.target) * 100
            return (
              <div
                key={goal.id}
                className="p-4 bg-slate-800/40 border border-slate-700/30 rounded-xl group hover:border-slate-600 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-200">{goal.text}</span>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-900/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-1000"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 w-12 text-right">
                    {goal.current}/{goal.target}
                  </span>
                </div>

                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => updateProgress(goal.id, -1)}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[10px] font-bold transition-all"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => updateProgress(goal.id, 1)}
                    className="px-2 py-1 bg-indigo-600/40 hover:bg-indigo-600/60 text-indigo-200 rounded text-[10px] font-bold transition-all"
                  >
                    +1
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
