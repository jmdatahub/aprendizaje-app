"use client"

import { Mountain } from "lucide-react"

interface MountainAnimationProps {
  progress: number // 0 to 1
  isActive: boolean
  isCompleted: boolean
}

export function MountainAnimation({ progress, isActive, isCompleted }: MountainAnimationProps) {
  // Sunlight moves across the mountain as progress increases
  const sunPos = progress * 100 // 0 to 100
  
  return (
    <div className="relative flex items-center justify-center">
      {isActive && (
        <div className="absolute w-[320px] h-[320px] rounded-full bg-orange-500/5 blur-3xl animate-pulse" />
      )}
      
      <svg width="320" height="320" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="skyDay" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
          
          <clipPath id="circleClip">
            <circle cx="100" cy="100" r="80" />
          </clipPath>
        </defs>

        {/* Sky Background */}
        <circle cx="100" cy="100" r="80" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
        
        <g clipPath="url(#circleClip)">
          {/* Distant Mountains */}
          <path d="M 0 200 L 50 120 L 100 160 L 150 110 L 200 200 Z" fill="#1e293b" opacity="0.5" />
          
          {/* Main Mountain */}
          <path d="M 30 200 L 100 60 L 170 200 Z" fill="#334155" />
          
          {/* Snow Peak */}
          <path d="M 85 91 L 100 60 L 115 91 L 105 85 L 100 95 L 95 85 Z" fill="white" opacity="0.9" />

          {/* Sun */}
          <circle cx={40 + sunPos} cy={60 - Math.sin(progress * Math.PI) * 20} r="8" fill="#fbbf24" className="shadow-lg shadow-yellow-500/50">
             {isActive && <animateTransform attributeName="transform" type="scale" values="1;1.1;1" dur="2s" repeatCount="indefinite" />}
          </circle>

          {/* Light Side of Mountain */}
          <path d="M 100 60 L 170 200 L 100 200 Z" fill="white" opacity={0.1 * progress} />
        </g>
      </svg>
    </div>
  )
}
