"use client"

import React, { useMemo } from 'react'
import { eachDayOfInterval, subDays, format, getDay, isSameMonth, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface ActivityHeatmapProps {
  data: { date: string; count: number }[]
  onSelectDate?: (date: string) => void
  selectedDate?: string | null
}

export function ActivityHeatmap({ data, onSelectDate, selectedDate }: ActivityHeatmapProps) {
  // Generar mapa de frecuencias
  const activityMap = useMemo(() => {
    const map = new Map<string, number>()
    data.forEach(item => {
      const day = item.date.split('T')[0]
      map.set(day, (map.get(day) || 0) + item.count)
    })
    return map
  }, [data])

  // Generar últimos 365 días
  const days = useMemo(() => {
    const today = new Date()
    const startDate = subDays(today, 364)
    return eachDayOfInterval({ start: startDate, end: today })
  }, [])

  // Agrupar por semanas
  const weeks = useMemo(() => {
    const weeksArray: Date[][] = []
    let currentWeek: Date[] = []

    days.forEach(day => {
      if (getDay(day) === 0 && currentWeek.length > 0) {
        weeksArray.push(currentWeek)
        currentWeek = []
      }
      currentWeek.push(day)
    })
    if (currentWeek.length > 0) weeksArray.push(currentWeek)
    
    return weeksArray
  }, [days])

  // Generar etiquetas de meses
  const monthLabels = useMemo(() => {
    return weeks.map((week, index) => {
      const firstDay = week[0]
      const prevWeek = weeks[index - 1]
      const prevFirstDay = prevWeek?.[0]

      if (!prevWeek || !isSameMonth(firstDay, prevFirstDay)) {
        return format(firstDay, 'MMM', { locale: es })
      }
      return null
    })
  }, [weeks])

  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-slate-800'
    if (count <= 1) return 'bg-green-200 dark:bg-green-900/40' // Adjusted for better visibility
    if (count <= 3) return 'bg-green-400 dark:bg-green-700'
    return 'bg-green-600 dark:bg-green-500'
  }

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex flex-col gap-1 min-w-max">
        
        {/* Etiquetas de Meses */}
        <div className="flex gap-1 h-5 text-xs text-muted-foreground mb-1">
          {monthLabels.map((label, i) => (
            <div key={i} className="w-3 flex overflow-visible">
              {label && <span className="transform -translate-x-1">{label}</span>}
            </div>
          ))}
        </div>

        {/* Grid de Días */}
        <div className="flex gap-1">
          {weeks.map((week, i) => (
            <div key={i} className="flex flex-col gap-1">
              {week.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const count = activityMap.get(dateKey) || 0
                const isSelected = selectedDate === dateKey
                
                return (
                  <div
                    key={dateKey}
                    onClick={() => onSelectDate?.(dateKey)}
                    title={`${format(day, 'PPP', { locale: es })}: ${count} actividades`}
                    className={cn(
                      "w-3 h-3 rounded-[2px] transition-all cursor-pointer",
                      getColor(count),
                      isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-card scale-110 z-10",
                      !isSelected && "hover:ring-1 hover:ring-gray-400 dark:hover:ring-gray-500"
                    )}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>Menos</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-[2px] bg-gray-100 dark:bg-slate-800" />
          <div className="w-3 h-3 rounded-[2px] bg-green-200 dark:bg-green-900/40" />
          <div className="w-3 h-3 rounded-[2px] bg-green-400 dark:bg-green-700" />
          <div className="w-3 h-3 rounded-[2px] bg-green-600 dark:bg-green-500" />
        </div>
        <span>Más</span>
      </div>
    </div>
  )
}
