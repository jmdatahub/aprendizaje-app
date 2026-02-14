"use client"

import { useState, useEffect } from "react"

export type AnimationType = "coffee-cup" | "battery" | "rocket" | "forest" | "mountain"

export interface AnimationDefinition {
  id: AnimationType
  label: string
  requiredMinutes: number
  description: string
}

export const ANIMATIONS: AnimationDefinition[] = [
  { id: "coffee-cup", label: "Taza de Café", requiredMinutes: 0, description: "La clásica taza humeante." },
  { id: "battery", label: "Batería", requiredMinutes: 30, description: "Carga energía mientras te enfocas." },
  { id: "rocket", label: "Cohete", requiredMinutes: 60, description: "¡Despegue hacia la productividad!" },
  { id: "forest", label: "Bosque", requiredMinutes: 120, description: "Paz y naturaleza." },
  { id: "mountain", label: "Montaña", requiredMinutes: 240, description: "Alcanza la cima de tus metas." },
]

export function useCollectibles() {
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("focus_timer_total_minutes") || "0")
    }
    return 0
  })

  const [currentSkin, setCurrentSkin] = useState<AnimationType>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("focus_timer_current_skin") as AnimationType) || "coffee-cup"
    }
    return "coffee-cup"
  })

  // Persistence
  useEffect(() => {
    localStorage.setItem("focus_timer_total_minutes", totalFocusMinutes.toString())
  }, [totalFocusMinutes])

  useEffect(() => {
    localStorage.setItem("focus_timer_current_skin", currentSkin)
  }, [currentSkin])

  const addMinutes = (m: number) => {
    setTotalFocusMinutes(prev => prev + m)
  }

  const isUnlocked = (anim: AnimationDefinition) => {
    return totalFocusMinutes >= anim.requiredMinutes
  }

  return {
    totalFocusMinutes,
    currentSkin,
    setCurrentSkin,
    addMinutes,
    isUnlocked,
    animations: ANIMATIONS
  }
}
