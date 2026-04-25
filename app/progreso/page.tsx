"use client"

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '@/shared/contexts/AppContext'
import { ActivityHeatmap } from '@/features/stats/components/ActivityHeatmap'
import { SkillCharts } from '@/features/stats/components/SkillCharts'
import { WeeklyChart } from "@/features/stats/components/WeeklyChart"
import Link from 'next/link'
import { Flame, CalendarDays, Zap, ArrowLeft, BookOpen, TrendingUp } from 'lucide-react'

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

  const filteredLogs = activityLog.filter(item => {
    if (filter === 'all') return true
    return item.type === filter
  })

  const statsSummary = React.useMemo(() => {
    const dates = filteredLogs.map(i => i.date.split('T')[0])
    const uniqueDates = new Set(dates)
    return {
      currentStreak: calculateStreak(dates),
      totalActiveDays: uniqueDates.size,
      totalActivities: filteredLogs.length
    }
  }, [filteredLogs])

  const weeklyData = React.useMemo(() => {
    const counts = new Array(7).fill(0)
    filteredLogs.forEach(log => {
      const d = new Date(log.date)
      if (!isNaN(d.getTime())) counts[d.getDay()]++
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

  function calculateStreak(dates: string[]) {
    if (!dates.length) return 0
    const unique = Array.from(new Set(dates)).sort().reverse()
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    let streak = 0
    let current = unique[0] === today ? today : (unique[0] === yesterday ? yesterday : null)
    if (!current) return 0
    let checkDate = new Date(current)
    streak = 1
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1)
      const checkStr = checkDate.toISOString().split('T')[0]
      if (unique.includes(checkStr)) streak++
      else break
    }
    return streak
  }

  const selectedActivities = filteredLogs.filter(log => log.date.startsWith(selectedDate || ''))

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Accent top bar */}
      <div className="h-[3px] w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400" />

      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-8 space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-violet-500">
              <TrendingUp className="w-3.5 h-3.5" />
              Tu evolución día a día
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Dashboard de Progreso
            </h1>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-border bg-card hover:bg-accent transition-colors self-start md:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
        </header>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="h-9 w-9 rounded-full border-[3px] border-violet-500/20 border-t-violet-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Filter tabs */}
            <div className="flex justify-center">
              <div className="flex gap-1 p-1 bg-muted/70 rounded-xl border border-border/50">
                <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} color="violet">
                  Global
                </FilterBtn>
                <FilterBtn active={filter === 'learning'} onClick={() => setFilter('learning')} color="cyan">
                  Aprendizajes
                </FilterBtn>
                <FilterBtn active={filter === 'practice'} onClick={() => setFilter('practice')} color="amber">
                  Habilidades
                </FilterBtn>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Racha */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                className="relative overflow-hidden rounded-2xl border border-orange-500/30 bg-card p-5 shadow-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent pointer-events-none" />
                <div className="relative flex items-start justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-orange-400">Racha Actual</p>
                  <div className="p-2 rounded-xl bg-orange-500/20">
                    <Flame className="w-4 h-4 text-orange-400" />
                  </div>
                </div>
                <div className="relative mt-3 flex items-end gap-1.5">
                  <span className="text-5xl font-bold text-orange-400 leading-none">{statsSummary.currentStreak}</span>
                  <span className="text-sm text-orange-400/70 mb-1">días</span>
                </div>
              </motion.div>

              {/* Días activos */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
                className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-card p-5 shadow-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent pointer-events-none" />
                <div className="relative flex items-start justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Días Activos</p>
                  <div className="p-2 rounded-xl bg-indigo-500/20">
                    <CalendarDays className="w-4 h-4 text-indigo-400" />
                  </div>
                </div>
                <div className="relative mt-3">
                  <span className="text-5xl font-bold text-indigo-400 leading-none">{statsSummary.totalActiveDays}</span>
                </div>
              </motion.div>

              {/* Total actividades */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-card p-5 shadow-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent pointer-events-none" />
                <div className="relative flex items-start justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Total Actividades</p>
                  <div className="p-2 rounded-xl bg-emerald-500/20">
                    <Zap className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
                <div className="relative mt-3">
                  <span className="text-5xl font-bold text-emerald-400 leading-none">{statsSummary.totalActivities}</span>
                </div>
              </motion.div>
            </div>

            {/* Heatmap */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Mapa de Constancia</h2>
                  {filter !== 'all' && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {filter === 'learning' ? 'Solo Aprendizajes' : 'Solo Práctica'}
                    </p>
                  )}
                </div>
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    Limpiar selección ✕
                  </button>
                )}
              </div>

              <ActivityHeatmap
                data={filteredLogs.map(l => ({ date: l.date, count: 1 }))}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />

              {selectedDate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-6 border-t border-border pt-5"
                >
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {selectedDate}
                  </p>
                  {selectedActivities.length > 0 ? (
                    <div className="space-y-2">
                      {selectedActivities.map((act, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-accent/40 border border-border/50">
                          <div className={`p-2 rounded-lg ${act.type === 'learning' ? 'bg-cyan-500/15 text-cyan-400' : 'bg-amber-500/15 text-amber-400'}`}>
                            {act.type === 'learning' ? <BookOpen className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {act.type === 'learning' ? 'Nuevo Aprendizaje' : 'Sesión de Práctica'}
                            </p>
                            {act.details && (
                              <p className="text-xs text-muted-foreground">
                                {act.details.skillId ? `${skillsStats.find(s => s.id === act.details.skillId)?.name || 'General'}` : ''}
                                {act.details.duration ? ` · ${Math.round(act.details.duration / 60)} min` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Sin actividad registrada en esta fecha para el filtro actual.
                    </p>
                  )}
                </motion.div>
              )}
            </motion.section>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
              <WeeklyChart data={weeklyData} />
              {filter !== 'learning' && <SkillCharts skillsStats={skillsStats} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function FilterBtn({
  children, active, onClick, color
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  color: 'violet' | 'cyan' | 'amber'
}) {
  const activeClasses = {
    violet: 'bg-violet-600 text-white shadow-md shadow-violet-500/30',
    cyan:   'bg-cyan-600 text-white shadow-md shadow-cyan-500/30',
    amber:  'bg-amber-500 text-white shadow-md shadow-amber-500/30',
  }
  return (
    <button
      onClick={onClick}
      className={`relative px-5 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
        active
          ? activeClasses[color]
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      }`}
    >
      {children}
    </button>
  )
}
