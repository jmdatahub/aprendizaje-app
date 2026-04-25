"use client"

import React from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { motion } from 'framer-motion'
import { useApp } from '@/shared/contexts/AppContext'
import { BarChart2 } from 'lucide-react'

interface SkillStats {
  id: string
  name: string
  totalSeconds: number
  sessionsCount: number
}

interface SkillChartsProps {
  skillsStats: SkillStats[]
}

const PALETTE = [
  '#8b5cf6', '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#ec4899'
]

const CustomPieTooltip = ({ active, payload, isDark }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className={`px-3 py-2 rounded-xl border shadow-lg text-sm ${
      isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      <p className="font-semibold">{payload[0].name}</p>
      <p style={{ color: payload[0].payload.fill }}>{payload[0].value} min</p>
    </div>
  )
}

const CustomBarTooltip = ({ active, payload, label, isDark }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className={`px-3 py-2 rounded-xl border shadow-lg text-sm ${
      isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      <p className="font-semibold">{label}</p>
      <p className={isDark ? 'text-violet-400' : 'text-violet-600'}>
        {payload[0].value} sesión{payload[0].value !== 1 ? 'es' : ''}
      </p>
    </div>
  )
}

export function SkillCharts({ skillsStats }: SkillChartsProps) {
  const { settings } = useApp()
  const isDark = settings.darkMode

  const pieData = skillsStats
    .filter(s => s.totalSeconds > 0)
    .map((s, i) => ({ name: s.name, value: Math.round(s.totalSeconds / 60), fill: PALETTE[i % PALETTE.length] }))
    .sort((a, b) => b.value - a.value)

  const barData = skillsStats
    .filter(s => s.sessionsCount > 0)
    .map((s, i) => ({ name: s.name, sesiones: s.sessionsCount, fill: PALETTE[i % PALETTE.length] }))
    .sort((a, b) => b.sesiones - a.sesiones)

  if (pieData.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center gap-3 min-h-[200px]">
        <div className="p-3 rounded-xl bg-muted">
          <BarChart2 className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Aún no hay sesiones registradas para mostrar gráficos.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Tiempo por habilidad */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-2xl p-6 shadow-sm"
      >
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground">Tiempo por habilidad</h3>
          <p className="text-xs text-muted-foreground mt-0.5">En minutos</p>
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} opacity={0.9} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip isDark={isDark} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Mini legend */}
        <div className="flex flex-wrap gap-2 mt-2">
          {pieData.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.fill }} />
              {d.name}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Sesiones realizadas */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-2xl p-6 shadow-sm"
      >
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground">Sesiones realizadas</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Por habilidad</p>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                width={90}
                tick={{ fontSize: 11, fill: isDark ? '#64748b' : '#94a3b8', fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomBarTooltip isDark={isDark} />} cursor={{ fill: isDark ? '#1e293b50' : '#f1f5f940' }} />
              <Bar dataKey="sesiones" radius={[0, 6, 6, 0]} maxBarSize={20}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  )
}
