"use client"

import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { motion } from 'framer-motion'
import { useApp } from '@/shared/contexts/AppContext'

interface SkillStats {
  id: string
  name: string
  totalSeconds: number
  sessionsCount: number
}

interface SkillChartsProps {
  skillsStats: SkillStats[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']

export function SkillCharts({ skillsStats }: SkillChartsProps) {
  const { settings } = useApp()
  const isDark = settings.darkMode

  // Preparar datos para Pie Chart (Tiempo)
  const pieData = skillsStats
    .filter(s => s.totalSeconds > 0)
    .map(s => ({
      name: s.name,
      value: Math.round(s.totalSeconds / 60) // Minutos
    }))
    .sort((a, b) => b.value - a.value)

  // Preparar datos para Bar Chart (Sesiones)
  const barData = skillsStats
    .filter(s => s.sessionsCount > 0)
    .map(s => ({
      name: s.name,
      sesiones: s.sessionsCount
    }))
    .sort((a, b) => b.sesiones - a.sesiones)

  if (pieData.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Aún no hay suficientes datos para mostrar gráficos.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Gráfico de Tiempo */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-xl p-6 shadow-sm"
      >
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <span>⏳</span> Tiempo por Habilidad (min)
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: isDark ? '#1f2937' : '#fff', 
                  borderColor: isDark ? '#374151' : '#e5e7eb',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Gráfico de Sesiones */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-xl p-6 shadow-sm"
      >
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <span>📊</span> Sesiones Realizadas
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={100} 
                tick={{ fontSize: 12, fill: isDark ? '#9ca3af' : '#4b5563' }} 
              />
              <RechartsTooltip 
                cursor={{ fill: isDark ? '#374151' : '#f3f4f6', opacity: 0.4 }}
                contentStyle={{ 
                  backgroundColor: isDark ? '#1f2937' : '#fff', 
                  borderColor: isDark ? '#374151' : '#e5e7eb',
                  borderRadius: '8px'
                }} 
              />
              <Bar dataKey="sesiones" radius={[0, 4, 4, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  )
}
