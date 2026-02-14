"use client"

import { Lock, Coffee, Battery, Rocket, TreePine, Mountain, Check, Plus } from "lucide-react"
import { AnimationType, AnimationDefinition } from "../hooks/useCollectibles"

interface AnimationSelectorProps {
  animations: AnimationDefinition[]
  currentSkin: AnimationType
  onSelect: (id: AnimationType) => void
  totalMinutes: number
  isUnlocked: (anim: AnimationDefinition) => boolean
}

export function AnimationSelector({
  animations,
  currentSkin,
  onSelect,
  totalMinutes,
  isUnlocked
}: AnimationSelectorProps) {
  
  const getIcon = (id: AnimationType) => {
    switch (id) {
      case "coffee-cup": return <Coffee className="w-8 h-8" />
      case "battery": return <Battery className="w-8 h-8" />
      case "rocket": return <Rocket className="w-8 h-8" />
      case "forest": return <TreePine className="w-8 h-8" />
      case "mountain": return <Mountain className="w-8 h-8" />
      default: return <Coffee className="w-8 h-8" />
    }
  }

  return (
    <div className="space-y-6 animate-scale-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <span>✨</span> Elige tu Animación
        </h3>
        <span className="text-xs font-mono text-indigo-400 px-2 py-1 bg-indigo-500/10 rounded-full">
          {totalMinutes} MIN enfocado
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {animations.map((anim) => {
          const unlocked = isUnlocked(anim)
          const active = currentSkin === anim.id

          return (
            <button
              key={anim.id}
              disabled={!unlocked}
              onClick={() => onSelect(anim.id)}
              className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all aspect-square overflow-hidden group ${
                active 
                  ? "bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/20"
                  : unlocked 
                    ? "bg-slate-800/40 border-slate-700 hover:border-slate-500 hover:bg-slate-800/60"
                    : "bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed"
              }`}
            >
              {/* Icon */}
              <div className={`mb-3 transition-transform group-hover:scale-110 ${active ? "text-indigo-300" : unlocked ? "text-slate-400" : "text-slate-600"}`}>
                {getIcon(anim.id)}
              </div>

              {/* Label */}
              <span className={`text-[10px] font-bold uppercase tracking-tighter text-center ${active ? "text-white" : "text-slate-500"}`}>
                {anim.label}
              </span>

              {/* Unlock Info / Status */}
              {!unlocked && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center">
                  <Lock className="w-4 h-4 text-slate-500 mb-1" />
                  <span className="text-[8px] font-medium text-slate-400 leading-tight">
                    {anim.requiredMinutes} MIN
                  </span>
                </div>
              )}

              {active && (
                <div className="absolute top-2 right-2">
                  <Check className="w-3 h-3 text-indigo-400" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-slate-800/20 rounded-2xl border border-slate-700/30 text-center">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          Completa sesiones de 25+ minutos para desbloquear coleccionables
        </p>
      </div>

      {/* Custom Section */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tus Animaciones</h4>
        <button className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-dashed border-slate-700 text-slate-500 hover:border-indigo-500 hover:text-indigo-400 transition-all text-xs font-bold uppercase tracking-widest group">
          <Plus className="w-4 h-4 group-hover:scale-125 transition-transform" />
          Crear Animación Custom
        </button>
      </div>
    </div>
  )
}
