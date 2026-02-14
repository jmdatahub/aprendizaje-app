"use client"

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '@/shared/contexts/AppContext'
import { ActivityHeatmap } from '@/features/stats/components/ActivityHeatmap'
import { SkillCharts } from '@/features/stats/components/SkillCharts'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { WeeklyChart } from "@/features/stats/components/WeeklyChart"

interface ActivityLogItem {
  date: string
  type: 'learning' | 'practice'
  details?: any
}

interface SkillStats {
  id: string
  name: string
  totalSeconds: number
  sessionsCount: number
}

export default function ProgresoPage() {
  const { t } = useApp()
  const [loading, setLoading] = useState(true)
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([])
  const [skillsStats, setSkillsStats] = useState<SkillStats[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'learning' | 'practice'>('all')

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/stats/activity')
        const json = await res.json()
        if (json.success) {
          setActivityLog(json.data.activityLog)
          setSkillsStats(json.data.skillsStats)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Filtrar logs según el estado actual
  const filteredLogs = activityLog.filter(item => {
    if (filter === 'all') return true
    return item.type === filter
  })

  // Calcular resumen basado en logs filtrados
  const statsSummary = React.useMemo(() => {
    const dates = filteredLogs.map(i => i.date.split('T')[0])
    const uniqueDates = new Set(dates)
    return {
      currentStreak: calculateStreak(dates),
      totalActiveDays: uniqueDates.size,
      totalActivities: filteredLogs.length
    }
  }, [filteredLogs])

  // Calcular distribución semanal
  const weeklyData = React.useMemo(() => {
    const counts = new Array(7).fill(0)
    filteredLogs.forEach(log => {
      const d = new Date(log.date)
      if (!isNaN(d.getTime())) {
        counts[d.getDay()]++
      }
    })

    return [
      { day: 'Lun', count: counts[1] },
      { day: 'Mar', count: counts[2] },
      { day: 'Mié', count: counts[3] },
      { day: 'Jue', count: counts[4] },
      { day: 'Vie', count: counts[5] },
      { day: 'Sáb', count: counts[6] },
      { day: 'Dom', count: counts[0] },
    ]
  }, [filteredLogs])

  // Helper simple para racha actual
  function calculateStreak(dates: string[]) {
    if (!dates.length) return 0
    const unique = Array.from(new Set(dates)).sort().reverse()
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    
    let streak = 0
    let current = unique[0] === today ? today : (unique[0] === yesterday ? yesterday : null)
    
    if (!current) return 0
    
    let checkDate = new Date(current)
    streak = 1 // Start with 1 since we found today or yesterday
    
    while (true) {
        checkDate.setDate(checkDate.getDate() - 1)
        const checkStr = checkDate.toISOString().split('T')[0]
        if (unique.includes(checkStr)) {
            streak++
        } else {
            break
        }
    }
    return streak
  }

  const selectedActivities = filteredLogs.filter(log => log.date.startsWith(selectedDate || ''))

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-24">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              📊 Dashboard de Progreso
            </h1>
            <p className="text-muted-foreground">Tu evolución día a día</p>
          </div>
          <div className="flex gap-2">
             <Link href="/">
              <Button variant="outline">← Volver</Button>
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Filtros */}
            <div className="flex justify-center">
              <div className="bg-muted p-1 rounded-lg inline-flex">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Global
                </button>
                <button
                  onClick={() => setFilter('learning')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'learning' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  🧠 Aprendizajes
                </button>
                <button
                  onClick={() => setFilter('practice')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'practice' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  ⚡ Habilidades
                </button>
              </div>
            </div>

            {/* Metricas Principales */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatsCard emoji="🔥" label="Racha Actual" value={`${statsSummary.currentStreak} días`} />
              <StatsCard emoji="📅" label="Días Activos" value={statsSummary.totalActiveDays} />
              <StatsCard emoji="🏆" label="Total Actividades" value={statsSummary.totalActivities} />
            </div>

            {/* Heatmap */}
            <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">
                  Mapa de Constancia {filter !== 'all' && `(${filter === 'learning' ? 'Aprendizajes' : 'Práctica'})`}
                </h2>
                {selectedDate && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
                    Limpiar selección
                  </Button>
                )}
              </div>
              
              <ActivityHeatmap 
                data={filteredLogs.map(l => ({ date: l.date, count: 1 }))} 
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />

              {/* Detalles de Actividad Seleccionada */}
              {selectedDate && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-6 border-t border-border pt-4"
                >
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Actividad del {selectedDate}
                  </h3>
                  {selectedActivities.length > 0 ? (
                    <div className="space-y-2">
                      {selectedActivities.map((act, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                          <span className="text-xl">{act.type === 'learning' ? '🧠' : '⚡'}</span>
                          <div>
                            <p className="font-medium text-sm text-foreground">
                              {act.type === 'learning' ? 'Nuevo Aprendizaje' : 'Sesión de Práctica'}
                            </p>
                            {act.details && (
                              <p className="text-xs text-muted-foreground">
                                {act.details.skillId ? `Habilidad: ${skillsStats.find(s => s.id === act.details.skillId)?.name || 'General'}` : ''}
                                {act.details.duration ? ` • ${Math.round(act.details.duration / 60)} min` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No hay actividad registrada en este día para el filtro actual.</p>
                  )}
                </motion.div>
              )}
            </section>

            {/* Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gráfico Semanal - Visible Siempre */}
              <WeeklyChart data={weeklyData} />
              
              {/* Gráficos de Habilidades - Solo visibles en Global o Práctica */}
              {filter !== 'learning' && (
                <div className="flex flex-col gap-6">
                   <h2 className="text-xl font-semibold text-foreground sr-only">Análisis de Habilidades</h2>
                   <SkillCharts skillsStats={skillsStats} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatsCard({ emoji, label, value }: { emoji: string, label: string, value: string | number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-3xl bg-accent/50 p-3 rounded-full">{emoji}</div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  )
}
