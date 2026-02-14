"use client"

interface CoffeeCupProps {
  progress: number // 0 (empty/start) → 1 (full timer elapsed, cup empty)
  isActive: boolean
  isCompleted: boolean
}

export function CoffeeCup({ progress, isActive, isCompleted }: CoffeeCupProps) {
  // Liquid level: starts full (progress=0) and drains (progress=1)
  const liquidLevel = 1 - progress // 1=full, 0=empty
  
  // Cup dimensions
  const cupTop = 55
  const cupBottom = 195
  const cupHeight = cupBottom - cupTop
  const liquidTop = cupBottom - (cupHeight * liquidLevel)

  // Wave animation offset
  const waveAmplitude = isActive ? 3 : 1.5

  return (
    <div className="relative flex items-center justify-center">
      {/* Glow behind cup */}
      {isActive && (
        <div
          className="absolute timer-pulse rounded-full"
          style={{
            width: 320,
            height: 320,
            background: "radial-gradient(circle, rgba(139,92,46,0.12) 0%, transparent 70%)",
          }}
        />
      )}
      {isCompleted && (
        <div
          className="absolute timer-glow-complete rounded-full"
          style={{
            width: 320,
            height: 320,
            background: "radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)",
          }}
        />
      )}

      <svg width="320" height="320" viewBox="0 0 250 250" className="drop-shadow-2xl">
        <defs>
          {/* Coffee liquid gradient */}
          <linearGradient id="coffeeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c49a6c" />
            <stop offset="40%" stopColor="#a0724a" />
            <stop offset="100%" stopColor="#6b4226" />
          </linearGradient>

          {/* Cream/foam gradient */}
          <linearGradient id="foamGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8d5b7" />
            <stop offset="100%" stopColor="#c49a6c" />
          </linearGradient>

          {/* Cup body gradient */}
          <linearGradient id="cupGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f5f0ea" />
            <stop offset="50%" stopColor="#e8ddd0" />
            <stop offset="100%" stopColor="#d4c4ae" />
          </linearGradient>

          {/* Dark cup gradient for dark theme */}
          <linearGradient id="cupDarkGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3a3a4a" />
            <stop offset="50%" stopColor="#2d2d3a" />
            <stop offset="100%" stopColor="#22222e" />
          </linearGradient>

          {/* Clip path for liquid inside cup */}
          <clipPath id="cupClip">
            <path d={`
              M 60 ${cupTop}
              L 55 ${cupBottom}
              Q 55 210 75 210
              L 175 210
              Q 195 210 195 ${cupBottom}
              L 190 ${cupTop}
              Z
            `} />
          </clipPath>

          {/* Steam effect filter */}
          <filter id="steamBlur">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* ===== CUP BODY ===== */}
        {/* Cup shadow */}
        <ellipse cx="125" cy="218" rx="65" ry="8" fill="rgba(0,0,0,0.15)" />

        {/* Cup outer body */}
        <path
          d={`
            M 55 ${cupTop - 5}
            L 50 ${cupBottom}
            Q 50 215 75 215
            L 175 215
            Q 200 215 200 ${cupBottom}
            L 195 ${cupTop - 5}
            Z
          `}
          fill="url(#cupDarkGradient)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />

        {/* Cup inner rim */}
        <ellipse cx="125" cy={cupTop - 5} rx="72" ry="10" fill="#1e1e2e" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

        {/* ===== HANDLE ===== */}
        <path
          d={`
            M 195 ${cupTop + 20}
            Q 230 ${cupTop + 30} 235 ${cupTop + 70}
            Q 237 ${cupTop + 110} 200 ${cupTop + 110}
          `}
          fill="none"
          stroke="url(#cupDarkGradient)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d={`
            M 195 ${cupTop + 20}
            Q 230 ${cupTop + 30} 235 ${cupTop + 70}
            Q 237 ${cupTop + 110} 200 ${cupTop + 110}
          `}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
          strokeLinecap="round"
        />

        {/* ===== LIQUID ===== */}
        {liquidLevel > 0.02 && (
          <g clipPath="url(#cupClip)">
            {/* Main liquid body */}
            <rect
              x="50"
              y={liquidTop}
              width="150"
              height={cupBottom - liquidTop + 20}
              fill="url(#coffeeGradient)"
            />

            {/* Wave surface */}
            <path
              d={`
                M 50 ${liquidTop}
                Q 80 ${liquidTop - waveAmplitude} 110 ${liquidTop}
                Q 140 ${liquidTop + waveAmplitude} 170 ${liquidTop}
                Q 190 ${liquidTop - waveAmplitude} 200 ${liquidTop}
                L 200 ${liquidTop + 5}
                Q 170 ${liquidTop + 5 + waveAmplitude} 140 ${liquidTop + 5}
                Q 110 ${liquidTop + 5 - waveAmplitude} 80 ${liquidTop + 5}
                Q 60 ${liquidTop + 5 + waveAmplitude} 50 ${liquidTop + 5}
                Z
              `}
              fill="url(#foamGradient)"
              opacity="0.7"
            >
              {isActive && (
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0,0; 3,-1; 0,0; -3,1; 0,0"
                  dur="3s"
                  repeatCount="indefinite"
                />
              )}
            </path>

            {/* Subtle shine on liquid */}
            <ellipse
              cx="100"
              cy={liquidTop + 15}
              rx="25"
              ry="8"
              fill="rgba(255,255,255,0.06)"
            />
          </g>
        )}

        {/* ===== STEAM ===== */}
        {liquidLevel > 0.3 && !isCompleted && (
          <g filter="url(#steamBlur)" opacity={isActive ? 0.5 : 0.25}>
            <path
              d={`M 95 ${cupTop - 15} Q 90 ${cupTop - 35} 100 ${cupTop - 50}`}
              fill="none"
              stroke="rgba(200,200,220,0.4)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 2,-3; -1,-5; 1,-2; 0,0"
                dur="2.5s"
                repeatCount="indefinite"
              />
              <animate attributeName="opacity" values="0.4;0.15;0.4" dur="2.5s" repeatCount="indefinite" />
            </path>
            <path
              d={`M 125 ${cupTop - 18} Q 130 ${cupTop - 40} 120 ${cupTop - 55}`}
              fill="none"
              stroke="rgba(200,200,220,0.35)"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; -2,-4; 1,-6; -1,-2; 0,0"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate attributeName="opacity" values="0.35;0.1;0.35" dur="3s" repeatCount="indefinite" />
            </path>
            <path
              d={`M 155 ${cupTop - 12} Q 160 ${cupTop - 30} 150 ${cupTop - 45}`}
              fill="none"
              stroke="rgba(200,200,220,0.3)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 1,-2; -2,-4; 0,-1; 0,0"
                dur="2.8s"
                repeatCount="indefinite"
              />
              <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2.8s" repeatCount="indefinite" />
            </path>
          </g>
        )}

        {/* Cup highlight */}
        <path
          d={`M 70 ${cupTop + 5} L 68 ${cupBottom - 10}`}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
