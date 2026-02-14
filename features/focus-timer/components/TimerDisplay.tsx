"use client"

import { TimerStatus } from "../hooks/useTimer"
import { AnimationType } from "../hooks/useCollectibles"
import { CoffeeCup } from "./CoffeeCup"
import { BatteryAnimation } from "./BatteryAnimation"
import { RocketAnimation } from "./RocketAnimation"
import { ForestAnimation } from "./animations/ForestAnimation"
import { MountainAnimation } from "./animations/MountainAnimation"

interface TimerDisplayProps {
  formattedTime: string
  progress: number
  status: TimerStatus
  goal?: string
  skinId?: AnimationType
  isWaitingConfirmation?: boolean
}

export function TimerDisplay({ 
  formattedTime, 
  progress, 
  status, 
  goal, 
  skinId = "coffee-cup",
  isWaitingConfirmation = false
}: TimerDisplayProps) {
  const isActive = status === "running"
  const isCompleted = status === "completed"

  const renderAnimation = () => {
    switch (skinId) {
      case "coffee-cup":
        return <CoffeeCup progress={progress} isActive={isActive} isCompleted={isCompleted} />
      case "battery":
        return <BatteryAnimation progress={progress} isActive={isActive} isCompleted={isCompleted} />
      case "rocket":
        return <RocketAnimation progress={progress} isActive={isActive} isCompleted={isCompleted} />
      case "forest":
        return <ForestAnimation progress={progress} isActive={isActive} isCompleted={isCompleted} />
      case "mountain":
        return <MountainAnimation progress={progress} isActive={isActive} isCompleted={isCompleted} />
      default:
        return <CoffeeCup progress={progress} isActive={isActive} isCompleted={isCompleted} />
    }
  }

  return (
    <div className={`flex flex-col items-center ${status === "idle" ? "gap-1" : "gap-4"}`}>
      {/* Current Animation with dynamic scaling */}
      <div className={`transition-all duration-700 ease-in-out transform ${status === "idle" ? "scale-[0.75] opacity-80" : "scale-100 opacity-100"}`}>
        {renderAnimation()}
      </div>

      {/* Time display below animation */}
      <div className="text-center">
        <span
          className={`font-mono font-bold tracking-wider transition-all duration-300 ${
            isCompleted ? "text-green-400 scale-110" : "text-white"
          } ${status === "idle" ? "text-4xl" : "text-6xl"}`}
        >
          {formattedTime}
        </span>

        {goal && status !== "idle" && (
          <p className="text-sm text-slate-400 mt-2 max-w-[280px] text-center truncate">
            {goal}
          </p>
        )}

        {isCompleted && !isWaitingConfirmation && (
          <p className="text-green-400 text-sm font-medium mt-2 animate-bounce">
            ¡Sesión completada! 🎉
          </p>
        )}
        
        {isWaitingConfirmation && (
          <p className="text-indigo-400 text-sm font-bold mt-2 animate-pulse uppercase tracking-widest">
            ¿Listo para el siguiente paso?
          </p>
        )}

        {isActive && (
          <p className="text-indigo-400/60 text-xs mt-3 uppercase tracking-widest font-bold">
            Enfocado
          </p>
        )}
      </div>
    </div>
  )
}
