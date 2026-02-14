"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react"

export type TodoTier = "S" | "A" | "B" | "C"

interface Todo {
  id: string
  text: string
  description?: string
  completed: boolean
  tier: TodoTier
  estimatedMinutes?: number
}

const TIER_COLORS: Record<TodoTier, string> = {
  S: "bg-red-500/20 text-red-400 border-red-500/30",
  A: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  B: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  C: "bg-slate-500/20 text-slate-400 border-slate-500/30",
}

const TIER_ORDER: Record<TodoTier, number> = { S: 0, A: 1, B: 2, C: 3 }

interface TodoListProps {
  onSelect?: (text: string, estimated?: number, id?: string, description?: string) => void
}

export function TodoList({ onSelect }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("focus_timer_todos")
      // Migration for old todos without tier
      const parsed = saved ? JSON.parse(saved) : []
      return parsed.map((t: any) => ({ ...t, tier: t.tier || "A" }))
    }
    return []
  })
  const [inputValue, setInputValue] = useState("")
  const [descriptionValue, setDescriptionValue] = useState("")
  const [selectedTier, setSelectedTier] = useState<TodoTier>("A")

  useEffect(() => {
    localStorage.setItem("focus_timer_todos", JSON.stringify(todos))
  }, [todos])

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    const newTodo: Todo = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      description: descriptionValue.trim(),
      completed: false,
      tier: selectedTier,
      estimatedMinutes: 0, // Initial 0, will be set in Focus Mode
    }
    setTodos([newTodo, ...todos])
    setInputValue("")
    setDescriptionValue("")
    setSelectedTier("A") // Reset to A
  }

  const toggleTodo = (id: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    )
  }

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id))
  }

  // Sort: Uncompleted first, then by TIER S > A > B > C
  const sortedTodos = [...todos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return TIER_ORDER[a.tier] - TIER_ORDER[b.tier]
  })

  return (
    <div className="w-full max-w-md bg-slate-800/20 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6 animate-fade-in shadow-xl">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="text-indigo-400">📋</span> Mis Tareas
      </h2>

      <form onSubmit={addTodo} className="space-y-3 mb-6">
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="¿Qué tienes que hacer?"
              className="flex-1 px-4 py-2 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <button
              type="submit"
              className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
          <input
            type="text"
            value={descriptionValue}
            onChange={(e) => setDescriptionValue(e.target.value)}
            placeholder="Añadir descripción o notas (opcional)..."
            className="w-full px-4 py-1.5 bg-slate-900/30 border border-slate-700/30 rounded-lg text-[11px] text-slate-400 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mr-2">Prioridad:</span>
          {(["S", "A", "B", "C"] as TodoTier[]).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setSelectedTier(tier)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                selectedTier === tier 
                  ? TIER_COLORS[tier] + " ring-2 ring-white/10" 
                  : "bg-slate-900/40 border-slate-800 text-slate-600 hover:text-slate-400"
              }`}
            >
              Tier {tier}
            </button>
          ))}
        </div>
      </form>

      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 scrollbar-hide">
        {sortedTodos.length === 0 ? (
          <div className="text-center py-10 opacity-50">
            <p className="text-4xl mb-2">🔭</p>
            <p className="text-slate-500 text-sm italic">Despejado como el cielo nocturno</p>
          </div>
        ) : (
          sortedTodos.map((todo) => (
            <div
              key={todo.id}
              className={`flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-700/30 rounded-xl group hover:border-slate-500 transition-all ${
                todo.tier === "S" && !todo.completed ? "ring-1 ring-red-500/30 bg-red-500/5" : ""
              }`}
            >
              <button
                onClick={() => toggleTodo(todo.id)}
                className={`transition-colors ${
                  todo.completed ? "text-emerald-400" : "text-slate-500 hover:text-slate-400"
                }`}
              >
                {todo.completed ? (
                  <CheckCircle2 className="w-5 h-5 fill-emerald-400/10" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>
              
              <div className="flex-1 flex flex-col gap-0.5">
                <span
                  className={`text-sm transition-all break-words ${
                     todo.completed ? "text-slate-500 line-through" : "text-slate-200"
                  }`}
                >
                  {todo.text}
                </span>
                {todo.description && (
                  <span className="text-[10px] text-slate-500 line-clamp-1 italic">
                    {todo.description}
                  </span>
                )}
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border self-start ${TIER_COLORS[todo.tier]} ${todo.completed ? "opacity-30" : ""}`}>
                  TIER {todo.tier}
                </span>
              </div>

              {onSelect && !todo.completed && (
                <button
                  onClick={() => onSelect(todo.text, todo.estimatedMinutes, todo.id, todo.description)}
                  className="p-1 px-2.5 bg-indigo-600/20 hover:bg-indigo-600 hover:text-white text-indigo-400 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 active:scale-90"
                  title="Seleccionar para Focus"
                >
                  🎯 Seleccionar
                </button>
              )}

              <button
                onClick={() => deleteTodo(todo.id)}
                className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
