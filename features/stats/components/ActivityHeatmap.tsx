"use client"

import React, { useMemo } from 'react'
import { eachDayOfInterval, subDays, format, getDay, isSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface ActivityHeatmapProps {
  data: { date: string; count: number }[]
  onSelectDate?: (date: string) => void
  selectedDate?: string | null
}

export function ActivityHeatmap({ data, onSelectDate, selectedDate }: ActivityHeatmapProps) {
  const activityMap = useMemo(() => {
    const map = new Map<string, number>()
    data.forEach(item => {
      const day = item.date.split('T')[0]
      map.set(day, (map.get(day) || 0) + item.count)
    })
    return map
  }, [data])

  const days = useMemo(() => {
    const today = new Date()
    return eachDayOfInterval({ start: subDays(today, 364), end: today })
  }, [])

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

  const getColorClass = (count: number, isSelected: boolean) => {
    if (isSelected) return 'bg-violet-500 scale-125 shadow-lg shadow-violet-500/50'
    if (count === 0) return 'bg-muted/60 hover:bg-muted'
    if (count === 1) return 'bg-violet-300/60 dark:bg-violet-900/60 hover:bg-violet-400/60 dark:hover:bg-violet-800/70'
    if (count <= 3) return 'bg-violet-400 dark:bg-violet-700 hover:bg-violet-500 dark:hover:bg-violet-600'
    return 'bg-violet-600 dark:bg-violet-500 hover:bg-violet-700 dark:hover:bg-violet-400'
  }

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex flex-col gap-1.5 min-w-max">

        {/* Month labels */}
        <div className="flex gap-[3px] h-5 text-[11px] text-muted-foreground mb-0.5 font-medium">
          {monthLabels.map((label, i) => (
            <div key={i} className="w-[14px] flex overflow-visible">
              {label && <span className="transform -translate-x-1 capitalize">{label}</span>}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="flex gap-[3px]">
          {weeks.map((week, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {week.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const count = activityMap.get(dateKey) || 0
                const isSelected = selectedDate === dateKey

                return (
                  <div
                    key={dateKey}
                    onClick={() => onSelectDate?.(dateKey)}
                    title={`${format(day, 'PPP', { locale: es })}: ${count} actividad${count !== 1 ? 'es' : ''}`}
                    className={cn(
                      'w-[14px] h-[14px] rounded-sm transition-all duration-150 cursor-pointer',
                      getColorClass(count, isSelected)
                    )}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
        <span>Menos</span>
        <div className="flex gap-[3px] items-center">
          <div className="w-[14px] h-[14px] rounded-sm bg-muted/60" />
          <div className="w-[14px] h-[14px] rounded-sm bg-violet-300/60 dark:bg-violet-900/60" />
          <div className="w-[14px] h-[14px] rounded-sm bg-violet-400 dark:bg-violet-700" />
          <div className="w-[14px] h-[14px] rounded-sm bg-violet-600 dark:bg-violet-500" />
        </div>
        <span>Más</span>
      </div>
    </div>
  )
}
