'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'

interface Sesion {
  id: string
  duracion_segundos: number
  fecha: string
}

interface AchievementsProps {
  sesiones: Sesion[]
  tiempoTotal: number
  nivel: string
}

interface Achievement {
  id: string
  icon: string
  title: string
  description: string
  unlocked: boolean
  progress?: number
  maxProgress?: number
}

const ACHIEVEMENT_DEFINITIONS = [
  // Rachas
  { id: 'racha_3', icon: '🔥', title: 'En llamas', description: '3 días seguidos', type: 'racha', requirement: 3 },
  { id: 'racha_7', icon: '🔥', title: 'Semana perfecta', description: '7 días seguidos', type: 'racha', requirement: 7 },
  { id: 'racha_30', icon: '🌋', title: 'Imparable', description: '30 días seguidos', type: 'racha', requirement: 30 },
  
  // Horas totales
  { id: 'horas_1', icon: '⏰', title: 'Primera hora', description: '1 hora practicada', type: 'horas', requirement: 1 },
  { id: 'horas_10', icon: '⏰', title: 'Dedicado', description: '10 horas practicadas', type: 'horas', requirement: 10 },
  { id: 'horas_50', icon: '🕐', title: 'Comprometido', description: '50 horas practicadas', type: 'horas', requirement: 50 },
  { id: 'horas_100', icon: '💯', title: 'Centenario', description: '100 horas practicadas', type: 'horas', requirement: 100 },
  
  // Sesiones
  { id: 'sesiones_10', icon: '📊', title: 'Consistente', description: '10 sesiones', type: 'sesiones', requirement: 10 },
  { id: 'sesiones_50', icon: '📈', title: 'Veterano', description: '50 sesiones', type: 'sesiones', requirement: 50 },
  
  // Niveles
  { id: 'nivel_aprendiz', icon: '🌱', title: 'Aprendiz', description: 'Alcanzar nivel Aprendiz', type: 'nivel', requirement: 'aprendiz' },
  { id: 'nivel_intermedio', icon: '⚡', title: 'Intermedio', description: 'Alcanzar nivel Intermedio', type: 'nivel', requirement: 'intermedio' },
  { id: 'nivel_avanzado', icon: '🌟', title: 'Avanzado', description: 'Alcanzar nivel Avanzado', type: 'nivel', requirement: 'avanzado' },
  { id: 'nivel_experto', icon: '👑', title: 'Experto', description: 'Alcanzar nivel Experto', type: 'nivel', requirement: 'experto' },
  { id: 'nivel_maestro', icon: '🏆', title: 'Maestro', description: 'Alcanzar nivel Maestro', type: 'nivel', requirement: 'maestro' },
]

const NIVEL_ORDER = ['novato', 'aprendiz', 'intermedio', 'avanzado', 'experto', 'maestro']

export function Achievements({ sesiones, tiempoTotal, nivel }: AchievementsProps) {
  const achievements = useMemo(() => {
    // Calcular racha actual
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const uniqueDays = new Set<string>()
    sesiones.forEach(s => {
      const d = new Date(s.fecha)
      d.setHours(0, 0, 0, 0)
      uniqueDays.add(d.toISOString())
    })
    
    const sortedDays = Array.from(uniqueDays).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    )
    
    let racha = 0
    if (sortedDays.length > 0) {
      const lastDay = new Date(sortedDays[0])
      const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays <= 1) {
        racha = 1
        for (let i = 1; i < sortedDays.length; i++) {
          const prev = new Date(sortedDays[i - 1])
          const curr = new Date(sortedDays[i])
          const diff = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24))
          if (diff === 1) racha++
          else break
        }
      }
    }
    
    const horasTotales = tiempoTotal / 3600
    const totalSesiones = sesiones.length
    const nivelIndex = NIVEL_ORDER.indexOf(nivel)
    
    return ACHIEVEMENT_DEFINITIONS.map(def => {
      let unlocked = false
      let progress = 0
      let maxProgress = typeof def.requirement === 'number' ? def.requirement : undefined
      
      if (def.type === 'racha') {
        progress = racha
        unlocked = racha >= (def.requirement as number)
      } else if (def.type === 'horas') {
        progress = Math.floor(horasTotales)
        unlocked = horasTotales >= (def.requirement as number)
      } else if (def.type === 'sesiones') {
        progress = totalSesiones
        unlocked = totalSesiones >= (def.requirement as number)
      } else if (def.type === 'nivel') {
        const reqIndex = NIVEL_ORDER.indexOf(def.requirement as string)
        unlocked = nivelIndex >= reqIndex
      }
      
      return {
        id: def.id,
        icon: def.icon,
        title: def.title,
        description: def.description,
        unlocked,
        progress: def.type !== 'nivel' ? progress : undefined,
        maxProgress
      } as Achievement
    })
  }, [sesiones, tiempoTotal, nivel])
  
  const unlockedCount = achievements.filter(a => a.unlocked).length
  
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          🏆 Logros
        </h3>
        <span className="text-sm text-muted-foreground">
          {unlockedCount}/{achievements.length}
        </span>
      </div>
      
      <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
        {achievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02 }}
            className={`relative group cursor-pointer ${
              achievement.unlocked ? '' : 'grayscale opacity-40'
            }`}
            title={`${achievement.title}: ${achievement.description}`}
          >
            <div className={`
              w-full aspect-square rounded-xl flex items-center justify-center text-2xl
              ${achievement.unlocked 
                ? 'bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30' 
                : 'bg-muted border border-border'
              }
            `}>
              {achievement.icon}
            </div>
            
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              <p className="font-semibold">{achievement.title}</p>
              <p className="text-muted-foreground">{achievement.description}</p>
              {achievement.progress !== undefined && (
                <p className="text-primary mt-1">
                  {achievement.progress}/{achievement.maxProgress}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
