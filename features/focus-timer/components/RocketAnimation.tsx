"use client"

interface RocketAnimationProps {
  progress: number // 0 (full/start) → 1 (empty/end)
  isActive: boolean
  isCompleted: boolean
}

export function RocketAnimation({ progress, isActive, isCompleted }: RocketAnimationProps) {
  const lift = progress * 20 // Sinks slightly as fuel runs out
  const fireScale = Math.max(0, 1 - progress)
  
  return (
    <div className="relative flex items-center justify-center">
      {isActive && (
        <div className="absolute w-[350px] h-[350px] rounded-full bg-orange-500/5 blur-3xl animate-pulse" />
      )}
      
      <svg width="320" height="320" viewBox="0 0 200 200">
        <defs>
          <radialGradient id="fireGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </radialGradient>
        </defs>

        {/* Fire/Engine */}
        {isActive && !isCompleted && fireScale > 0.05 && (
          <g transform={`translate(100, 140) scale(${fireScale})`}>
            <path
              d="M -15 0 Q 0 40 15 0 Z"
              fill="url(#fireGradient)"
            >
              <animate
                attributeName="d"
                values="M -15 0 Q 0 40 15 0 Z; M -15 0 Q 0 60 15 0 Z; M -15 0 Q 0 40 15 0 Z"
                dur="0.2s"
                repeatCount="indefinite"
              />
            </path>
          </g>
        )}

        {/* Rocket Body */}
        <g transform={`translate(0, ${lift})`}>
          {/* Main Body */}
          <path
            d="M 100 40 C 80 40 70 80 70 140 L 130 140 C 130 80 120 40 100 40"
            fill="#e2e8f0"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          {/* Window */}
          <circle cx="100" cy="80" r="10" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />
          
          {/* Fins */}
          <path d="M 70 110 L 55 140 L 70 140 Z" fill="#ef4444" />
          <path d="M 130 110 L 145 140 L 130 140 Z" fill="#ef4444" />
        </g>
      </svg>
    </div>
  )
}
