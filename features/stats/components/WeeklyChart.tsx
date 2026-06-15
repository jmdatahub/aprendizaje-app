"use client"

import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { useApp } from '@/shared/contexts/AppContext'

interface WeeklyChartProps {
  data: { day: string; count: number }[]
}

const CustomTooltip = ({ active, payload, label, isDark }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string | number;
  isDark?: boolean;
}) => {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: isDark ? '#1e1b4b' : '#fff',
        border: `1px solid ${isDark ? '#4c1d95' : '#ddd6fe'}`,
        borderRadius: 12,
        padding: '8px 14px',
        fontSize: 13,
      }}
    >
      <p style={{ fontWeight: 600, color: isDark ? '#c4b5fd' : '#5b21b6', marginBottom: 2 }}>{label}</p>
      <p style={{ color: isDark ? '#a78bfa' : '#7c3aed' }}>
        {payload[0].value} actividad{payload[0].value !== 1 ? 'es' : ''}
      </p>
    </div>
  )
}

const BAR_COLORS_DARK  = ['#7c3aed','#6d28d9','#5b21b6','#4c1d95','#6d28d9','#7c3aed','#8b5cf6']
const BAR_COLORS_LIGHT = ['#7c3aed','#6d28d9','#5b21b6','#4c1d95','#6d28d9','#7c3aed','#8b5cf6']

// Color de resalte para la barra del día de hoy.
const TODAY_COLOR_DARK = '#c4b5fd'
const TODAY_COLOR_LIGHT = '#a855f7'

// Etiquetas de día tal y como las genera la página de progreso (índice = getDay()).
const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function WeeklyChart({ data }: WeeklyChartProps) {
  const { settings } = useApp()
  const isDark = settings.darkMode
  const colors = isDark ? BAR_COLORS_DARK : BAR_COLORS_LIGHT
  const todayLabel = DAY_LABELS[new Date().getDay()]
  const todayColor = isDark ? TODAY_COLOR_DARK : TODAY_COLOR_LIGHT

  // Resumen textual para lectores de pantalla.
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const top = data.reduce(
    (best, d) => (d.count > best.count ? d : best),
    { day: '', count: -1 }
  )
  const ariaSummary =
    total > 0
      ? `Actividad semanal: ${total} actividad${total !== 1 ? 'es' : ''} en total. Día con más actividad: ${top.day} con ${top.count}.`
      : 'Actividad semanal: sin actividad registrada esta semana.'

  return (
    <div className="w-full bg-card border border-border rounded-2xl p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-foreground">Actividad semanal</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Distribución por día de la semana</p>
      </div>

      <div className="h-[140px] sm:h-[220px] w-full" role="img" aria-label={ariaSummary}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barCategoryGap="40%">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? '#1e293b' : '#f1f5f9'}
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fill: isDark ? '#64748b' : '#94a3b8', fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tick={{ fill: isDark ? '#64748b' : '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: isDark ? '#7c3aed15' : '#7c3aed08', radius: 6 } as React.SVGProps<SVGElement> & { radius: number }}
              content={<CustomTooltip isDark={isDark} />}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={32}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.day === todayLabel ? todayColor : colors[index % colors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
