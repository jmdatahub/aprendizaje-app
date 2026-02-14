'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'

interface Sesion {
  id: string
  duracion_segundos: number
  fecha: string
}

interface ProgressChartProps {
  sesiones: Sesion[]
}

export function ProgressChart({ sesiones }: ProgressChartProps) {
  // Agrupar sesiones por día (últimos 7 días)
  const chartData = useMemo(() => {
    const today = new Date()
    const days: { date: Date; label: string; segundos: number }[] = []
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      const label = date.toLocaleDateString('es-ES', { weekday: 'short' })
      days.push({ date, label: label.charAt(0).toUpperCase() + label.slice(1, 3), segundos: 0 })
    }

    // Sumar tiempo por día
    sesiones.forEach(sesion => {
      const fecha = new Date(sesion.fecha)
      fecha.setHours(0, 0, 0, 0)
      
      const dayIndex = days.findIndex(d => d.date.getTime() === fecha.getTime())
      if (dayIndex !== -1) {
        days[dayIndex].segundos += sesion.duracion_segundos
      }
    })

    return days
  }, [sesiones])

  const maxSegundos = Math.max(...chartData.map(d => d.segundos), 1)
  const totalSemana = chartData.reduce((acc, d) => acc + d.segundos, 0)

  const formatTime = (segundos: number) => {
    if (segundos === 0) return '0m'
    const horas = Math.floor(segundos / 3600)
    const minutos = Math.floor((segundos % 3600) / 60)
    if (horas > 0) return `${horas}h ${minutos}m`
    return `${minutos}m`
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          📊 Esta semana
        </h3>
        <span className="text-sm text-muted-foreground">
          Total: <span className="font-medium text-foreground">{formatTime(totalSemana)}</span>
        </span>
      </div>

      {/* Gráfica de barras */}
      <div className="flex items-end justify-between gap-2 h-32">
        {chartData.map((day, index) => {
          const heightPercent = maxSegundos > 0 ? (day.segundos / maxSegundos) * 100 : 0
          const isToday = index === chartData.length - 1
          
          return (
            <div key={day.label} className="flex-1 flex flex-col items-center gap-1">
              {/* Barra */}
              <div className="w-full flex-1 flex items-end">
                <motion.div
                  className={`w-full rounded-t-md ${
                    day.segundos > 0
                      ? isToday
                        ? 'bg-gradient-to-t from-primary to-primary/70'
                        : 'bg-gradient-to-t from-primary/60 to-primary/40'
                      : 'bg-muted'
                  }`}
                  initial={{ height: 0 }}
                  animate={{ height: day.segundos > 0 ? `${Math.max(heightPercent, 8)}%` : '4px' }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  title={formatTime(day.segundos)}
                />
              </div>
              
              {/* Label */}
              <span className={`text-xs ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                {day.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Leyenda si hay práctica hoy */}
      {chartData[6]?.segundos > 0 && (
        <motion.p 
          className="text-xs text-center text-green-600 dark:text-green-400 mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          ✅ ¡Hoy has practicado {formatTime(chartData[6].segundos)}!
        </motion.p>
      )}
    </div>
  )
}
