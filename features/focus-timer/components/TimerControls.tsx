"use client"

import { TimerStatus } from "../hooks/useTimer"
import { Play, Pause, RotateCcw, Square } from "lucide-react"

interface TimerControlsProps {
  status: TimerStatus
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onReset: () => void
}

export function TimerControls({ status, onStart, onPause, onResume, onReset }: TimerControlsProps) {
  if (status === "idle") {
    return (
      <button
        onClick={onStart}
        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        Iniciar Focus
      </button>
    )
  }

  if (status === "completed") {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Nueva Sesión
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {status === "running" ? (
        <button
          onClick={onPause}
          className="flex items-center gap-2 px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
        >
          <Pause className="w-3.5 h-3.5 fill-current" />
          Pausar
        </button>
      ) : (
        <button
          onClick={onResume}
          className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Reanudar
        </button>
      )}

      <button
        onClick={onReset}
        className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 border border-slate-700/30"
      >
        <Square className="w-3 h-3 fill-current" />
        Parar
      </button>
    </div>
  )
}
