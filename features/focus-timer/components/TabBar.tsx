"use client"

import { Coffee, ListTodo, Calendar, Target } from "lucide-react"

export type TimerTab = "focus" | "todos" | "habits" | "goals"

interface TabBarProps {
  activeTab: TimerTab
  onTabChange: (tab: TimerTab) => void
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const tabs = [
    { id: "focus", label: "Focus", icon: Coffee },
    { id: "todos", label: "To-Dos", icon: ListTodo },
    { id: "habits", label: "Habits", icon: Calendar },
    { id: "goals", label: "Goals", icon: Target },
  ] as const

  return (
    <div className="flex items-center justify-center w-full px-4 mb-8">
      <div className="flex items-center gap-1 bg-slate-800/40 p-1 rounded-2xl border border-slate-700/50 backdrop-blur-md">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 min-w-20 ${
                isActive
                  ? "bg-slate-700 shadow-lg text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-indigo-400" : ""}`} />
              <span className="text-[10px] uppercase tracking-wider font-semibold">
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
