"use client"

interface BatteryAnimationProps {
  progress: number // 0 (full/start) → 1 (empty/end)
  isActive: boolean
  isCompleted: boolean
}

export function BatteryAnimation({ progress, isActive, isCompleted }: BatteryAnimationProps) {
  const chargeLevel = 1 - progress // 1=full, 0=empty
  const fillHeight = 120 * chargeLevel
  
  return (
    <div className="relative flex items-center justify-center">
      {isActive && (
        <div className="absolute w-[300px] h-[300px] rounded-full bg-emerald-500/5 blur-3xl animate-pulse" />
      )}
      
      <svg width="320" height="320" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="batteryGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chargeLevel > 0.2 ? "#10b981" : "#f43f5e"} />
            <stop offset="100%" stopColor={chargeLevel > 0.2 ? "#059669" : "#e11d48"} />
          </linearGradient>
        </defs>

        {/* Battery Body */}
        <rect
          x="60"
          y="40"
          width="80"
          height="130"
          rx="10"
          fill="none"
          stroke="#334155"
          strokeWidth="6"
        />
        
        {/* Battery Tip */}
        <rect
          x="85"
          y="25"
          width="30"
          height="15"
          rx="4"
          fill="#334155"
        />

        {/* Liquid Fill */}
        <rect
          x="66"
          y={164 - fillHeight}
          width="68"
          height={fillHeight}
          rx="4"
          fill="url(#batteryGradient)"
          className="transition-all duration-1000 ease-linear"
        />

        {/* Subtle Shine */}
        <rect
          x="120"
          y="50"
          width="10"
          height="110"
          rx="5"
          fill="white"
          opacity="0.05"
        />
      </svg>
    </div>
  )
}
