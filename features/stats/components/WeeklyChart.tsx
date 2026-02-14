"use client"

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { useApp } from '@/shared/contexts/AppContext'

interface WeeklyChartProps {
  data: { day: string; count: number }[]
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  const { settings } = useApp()
  const isDark = settings.darkMode

  return (
    <div className="w-full bg-card border border-border rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        📅 Actividad por Día de la Semana
      </h3>
      
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
            <XAxis 
              dataKey="day" 
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} 
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} 
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: isDark ? '#1e293b' : '#f1f5f9' }}
              contentStyle={{
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                borderColor: isDark ? '#1e293b' : '#e2e8f0',
                borderRadius: '8px',
                color: isDark ? '#f8fafc' : '#0f172a'
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={isDark ? '#818cf850' : '#4f46e5'} // Indigo color for variety
                  stroke={isDark ? '#818cf8' : 'none'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
