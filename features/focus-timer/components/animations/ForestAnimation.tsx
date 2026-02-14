"use client"

import { TreePine } from "lucide-react"

interface ForestAnimationProps {
  progress: number // 0 to 1
  isActive: boolean
  isCompleted: boolean
}

export function ForestAnimation({ progress, isActive, isCompleted }: ForestAnimationProps) {
  // Trees grow slightly or sky changes color
  const treeCount = 5
  const opacity = 1 - progress

  return (
    <div className="relative flex items-center justify-center">
      {isActive && (
        <div className="absolute w-[320px] h-[320px] rounded-full bg-emerald-500/5 blur-3xl animate-pulse" />
      )}
      
      <svg width="320" height="320" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          
          <path id="pineTree" d="M 0 -20 L 15 10 L -15 10 Z M 0 -35 L 12 -10 L -12 -10 Z M 0 -45 L 8 -25 L -8 -25 Z" fill="#065f46" />
        </defs>

        {/* Background Circle */}
        <circle cx="100" cy="100" r="80" fill="url(#skyGradient)" stroke="#1e293b" strokeWidth="2" />

        {/* Ground */}
        <path d="M 30 140 Q 100 120 170 140 L 170 180 L 30 180 Z" fill="#064e3b" />

        {/* Trees */}
        <g transform="translate(60, 140) scale(0.8)">
          <use href="#pineTree" fill="#10b981" opacity={opacity > 0.2 ? 1 : 0.4} />
        </g>
        <g transform="translate(100, 135)">
          <use href="#pineTree" fill="#059669" />
        </g>
        <g transform="translate(140, 145) scale(0.9)">
          <use href="#pineTree" fill="#10b981" opacity={opacity > 0.5 ? 1 : 0.6} />
        </g>

        {/* Falling leaves/elements if active */}
        {isActive && !isCompleted && (
          <g opacity="0.4">
            <circle cx="50" cy="40" r="1" fill="white">
              <animate attributeName="cy" from="40" to="140" dur="3s" repeatCount="indefinite" />
              <animate attributeName="cx" values="50;55;50" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="150" cy="60" r="1" fill="white">
              <animate attributeName="cy" from="60" to="140" dur="4s" repeatCount="indefinite" />
              <animate attributeName="cx" values="150;145;150" dur="3s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* Progress Mist */}
        <rect
          x="20"
          y={100 + (1-progress) * 80}
          width="160"
          height="80"
          fill="white"
          opacity="0.05"
          className="transition-all duration-1000"
        />
      </svg>
    </div>
  )
}
