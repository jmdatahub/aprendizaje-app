"use client"

/**
 * Anillo de progreso semanal (X/20 palabras aprendidas esta semana) con la
 * mini-meta diaria (3 puntos) en el centro.
 */
interface Props {
  weekLearned: number
  weeklyGoal: number
  todayLearned: number
  dailyGoal: number
}

export function WeeklyRing({ weekLearned, weeklyGoal, todayLearned, dailyGoal }: Props) {
  const pct = weeklyGoal > 0 ? Math.min(1, weekLearned / weeklyGoal) : 0
  const size = 132
  const stroke = 11
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  const done = weekLearned >= weeklyGoal

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className={done ? "text-emerald-500 transition-all duration-700" : "text-indigo-500 transition-all duration-700"}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground leading-none tabular-nums">{weekLearned}</span>
          <span className="text-xs text-muted-foreground">de {weeklyGoal}</span>
        </div>
      </div>

      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">Esta semana</h2>
        <p className="text-xs text-muted-foreground mb-2">
          {done ? "¡Meta semanal cumplida! 🎉" : `Te faltan ${weeklyGoal - weekLearned} palabras`}
        </p>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: dailyGoal }).map((_, i) => (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${i < todayLearned ? "bg-emerald-500" : "bg-muted-foreground/25"}`}
              aria-hidden="true"
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1.5">
            hoy {Math.min(todayLearned, dailyGoal)}/{dailyGoal}
          </span>
        </div>
      </div>
    </div>
  )
}
