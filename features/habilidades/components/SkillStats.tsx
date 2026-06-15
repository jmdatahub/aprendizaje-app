'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { formatearTiempo } from '@/shared/constants/habilidades'

interface Sesion {
  id: string
  duracion_segundos: number
  fecha: string
}

interface SkillStatsProps {
  sesiones: Sesion[]
  tiempoTotal: number
  /** Meta semanal en minutos. Si se define (>0) se muestra el progreso de la semana. */
  objetivoSemanalMinutos?: number | null
}

export function SkillStats({ sesiones, tiempoTotal, objetivoSemanalMinutos }: SkillStatsProps) {
  const stats = useMemo(() => {
    if (sesiones.length === 0) {
      return {
        racha: 0,
        mejorSesion: 0,
        promedio: 0,
        ultimaPractica: null as Date | null,
        totalSesiones: 0
      }
    }

    // Ordenar por fecha descendente
    const sorted = [...sesiones].sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    )

    // Calcular racha de días consecutivos
    let racha = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const uniqueDays = new Set<string>()
    sorted.forEach(s => {
      const d = new Date(s.fecha)
      d.setHours(0, 0, 0, 0)
      uniqueDays.add(d.toISOString())
    })
    
    const sortedDays = Array.from(uniqueDays).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    )

    // Verificar si practicó hoy o ayer para empezar la racha
    const lastDay = new Date(sortedDays[0] || today)
    const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 1) {
      racha = 1
      for (let i = 1; i < sortedDays.length; i++) {
        const prev = new Date(sortedDays[i - 1])
        const curr = new Date(sortedDays[i])
        const diff = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24))
        if (diff === 1) {
          racha++
        } else {
          break
        }
      }
    }

    // Mejor sesión
    const mejorSesion = Math.max(...sesiones.map(s => s.duracion_segundos))

    // Promedio por sesión
    const promedio = Math.round(tiempoTotal / sesiones.length)

    // Última práctica
    const ultimaPractica = new Date(sorted[0].fecha)

    return {
      racha,
      mejorSesion,
      promedio,
      ultimaPractica,
      totalSesiones: sesiones.length
    }
  }, [sesiones, tiempoTotal])

  // Progreso de la meta semanal (semana actual, de lunes a domingo)
  const statsSemana = useMemo(() => {
    if (!objetivoSemanalMinutos || objetivoSemanalMinutos <= 0) return null

    // Inicio de semana (lunes a las 00:00)
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now)
    monday.setDate(diff)
    monday.setHours(0, 0, 0, 0)

    const segundosSemana = sesiones.reduce((acc, s) => {
      return new Date(s.fecha) >= monday ? acc + s.duracion_segundos : acc
    }, 0)

    const metaSegundos = objetivoSemanalMinutos * 60
    const porcentaje = Math.min((segundosSemana / metaSegundos) * 100, 100)

    return {
      actual: segundosSemana,
      meta: metaSegundos,
      porcentaje,
      cumplida: segundosSemana >= metaSegundos
    }
  }, [sesiones, objetivoSemanalMinutos])

  const formatRelativeDate = (date: Date | null) => {
    if (!date) return 'Nunca'
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} días`
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const statCards: { icon: string; label: string; value: string; color: string; ariaLabel?: string }[] = [
    {
      icon: '🔥',
      label: 'Racha',
      value: `${stats.racha} ${stats.racha === 1 ? 'día' : 'días'}`,
      color: stats.racha > 0 ? 'text-orange-500' : 'text-muted-foreground',
      // La racha se distingue por color; el aria-label la hace accesible sin depender del color.
      ariaLabel: `Racha: ${stats.racha} ${stats.racha === 1 ? 'día' : 'días'}`
    },
    {
      icon: '🏆',
      label: 'Mejor sesión',
      value: formatearTiempo(stats.mejorSesion),
      color: 'text-yellow-500'
    },
    {
      icon: '📊',
      label: 'Promedio',
      value: formatearTiempo(stats.promedio),
      color: 'text-blue-500'
    },
    {
      icon: '📅',
      label: 'Última práctica',
      value: formatRelativeDate(stats.ultimaPractica),
      color: 'text-green-500'
    }
  ]

  // Frase dinámica para la meta semanal
  const fraseMeta = (() => {
    if (!statsSemana) return ''
    if (statsSemana.cumplida) return '¡Meta alcanzada! 🎉'
    const actualMin = Math.round(statsSemana.actual / 60)
    const metaMin = Math.round(statsSemana.meta / 60)
    return `Vas ${actualMin}/${metaMin} min esta semana`
  })()

  // Sin sesiones no hay estadísticas que mostrar; pero si hay meta semanal
  // mostramos al menos el widget de progreso (en 0) para no ocultar el objetivo.
  if (sesiones.length === 0 && !statsSemana) {
    return null
  }

  return (
    <div className="space-y-3">
      {/* Progreso de meta semanal */}
      {statsSemana && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              🎯 Meta semanal
            </h4>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {Math.round(statsSemana.porcentaje)}%
            </span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${statsSemana.cumplida ? 'bg-green-500' : 'bg-blue-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${statsSemana.porcentaje}%` }}
              transition={{ duration: 0.8 }}
              role="progressbar"
              aria-valuenow={Math.round(statsSemana.porcentaje)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso de la meta semanal"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{fraseMeta}</p>
        </motion.div>
      )}

      {/* Tarjetas de estadísticas */}
      {sesiones.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card rounded-xl border border-border p-4 text-center"
            >
              <span className="text-2xl mb-1 block">{stat.icon}</span>
              <p className={`text-lg font-bold ${stat.color}`} aria-label={stat.ariaLabel}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
