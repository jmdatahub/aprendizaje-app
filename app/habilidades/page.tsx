'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { SkillCard } from '@/features/habilidades/components/SkillCard'
import { NewSkillModal } from '@/features/habilidades/components/NewSkillModal'
import { TrashModal } from '@/shared/components/TrashModal'
import { CATEGORIAS_HABILIDADES } from '@/shared/constants/habilidades'
import { playClick } from '@/shared/utils/sounds'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Habilidad {
  id: string
  nombre: string
  categorias: string[]
  tiempo_total_segundos: number
  nivel: string
  created_at: string
}

export default function HabilidadesPage() {
  const [habilidades, setHabilidades] = useState<Habilidad[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showTrashModal, setShowTrashModal] = useState(false)
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('creacion-desc')

  useEffect(() => {
    fetchHabilidades()
  }, [])

  const fetchHabilidades = async () => {
    try {
      const res = await fetch('/api/habilidades')
      const data = await res.json()
      if (data.success) {
        setHabilidades(data.data.items || [])
      }
    } catch (e) {
      console.error('Error fetching habilidades:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreated = (nuevaHabilidad: Habilidad) => {
    setHabilidades(prev => [nuevaHabilidad, ...prev])
  }

  const filteredHabilidades = filtroCategoria
    ? habilidades.filter(h => (h.categorias || []).includes(filtroCategoria))
    : habilidades

  const sortedHabilidades = [...filteredHabilidades].sort((a, b) => {
    switch (sortBy) {
      case 'nombre-asc':
        return a.nombre.localeCompare(b.nombre)
      case 'nombre-desc':
        return b.nombre.localeCompare(a.nombre)
      case 'tiempo-desc':
        return b.tiempo_total_segundos - a.tiempo_total_segundos
      case 'tiempo-asc':
        return a.tiempo_total_segundos - b.tiempo_total_segundos
      case 'creacion-asc':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'creacion-desc':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  // Calcular stats
  const tiempoTotal = habilidades.reduce((acc, h) => acc + h.tiempo_total_segundos, 0)
  const horasTotales = Math.floor(tiempoTotal / 3600)

  const handleExport = () => {
    const headers = ['Nombre', 'Categorías', 'Nivel', 'Tiempo Total (horas)', 'Fecha Creación']
    const csvContent = [
      headers.join(','),
      ...sortedHabilidades.map(h => {
        const cats = (h.categorias || []).map(c => 
          CATEGORIAS_HABILIDADES.find(cat => cat.id === c)?.label || c
        ).join('; ')
        const nivelLabel = CATEGORIAS_HABILIDADES.find(c => c.id === h.nivel)?.label || h.nivel
        
        return [
          `"${h.nombre}"`,
          `"${cats}"`,
          h.nivel,
          (h.tiempo_total_segundos / 3600).toFixed(2),
          new Date(h.created_at).toLocaleDateString()
        ].join(',')
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `habilidades_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="mx-auto max-w-6xl">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Inicio
            </Button>
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              🎯 Mis Habilidades
            </h1>
            <p className="text-muted-foreground">
              Practica y mide tu progreso en habilidades prácticas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                playClick()
                setShowTrashModal(true)
              }}
              className="gap-1"
            >
              🗑️ Papelera
            </Button>
            <Button 
              onClick={() => {
                playClick()
                setShowNewModal(true)
              }}
              className="gap-2 shrink-0"
            >
              <span>+</span>
              Nueva habilidad
            </Button>
          </div>
        </motion.div>

        {/* Stats summary */}
        {habilidades.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4 flex flex-wrap items-center gap-6"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Total practicado</p>
                <p className="text-xl font-bold text-foreground">{horasTotales}h</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Habilidades</p>
                <p className="text-xl font-bold text-foreground">{habilidades.length}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Filtros por categoría */}
        {habilidades.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 flex flex-wrap gap-2"
          >
            <button
              onClick={() => {
                playClick()
                setFiltroCategoria(null)
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                !filtroCategoria
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              Todas
            </button>
            {CATEGORIAS_HABILIDADES.filter(c => c.id !== 'otra').map(cat => {
              const count = habilidades.filter(h => (h.categorias || []).includes(cat.id)).length
              if (count === 0) return null
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    playClick()
                    setFiltroCategoria(cat.id)
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                    filtroCategoria === cat.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  <span>{cat.icono}</span>
                  <span>{cat.label}</span>
                  <span className="text-xs opacity-70">({count})</span>
                </button>
              )
            })}
          </motion.div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        ) : habilidades.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-card rounded-3xl border border-dashed border-border"
          >
            <div className="text-6xl mb-4 opacity-30">🎯</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Aún no tienes habilidades
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              ¡Empieza a medir tu progreso! Añade una habilidad que quieras desarrollar.
            </p>
            <Button 
              onClick={() => setShowNewModal(true)}
              size="lg"
              className="gap-2"
            >
              <span>+</span>
              Añadir mi primera habilidad
            </Button>
          </motion.div>
        ) : filteredHabilidades.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No tienes habilidades en esta categoría
          </div>
        ) : (
          <>
            {/* Barra de herramientas: Ordenar + Exportar */}
            {habilidades.length > 0 && (
              <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Ordenar por:</span>
                  <Select 
                    value={sortBy} 
                    onValueChange={(value) => {
                      playClick()
                      setSortBy(value)
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creacion-desc">Más recientes</SelectItem>
                      <SelectItem value="creacion-asc">Más antiguas</SelectItem>
                      <SelectItem value="tiempo-desc">Más practicadas</SelectItem>
                      <SelectItem value="tiempo-asc">Menos practicadas</SelectItem>
                      <SelectItem value="nombre-asc">Nombre (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExport}
                  className="gap-2"
                >
                  <span>📥</span>
                  Exportar CSV
                </Button>
              </div>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedHabilidades.map((habilidad, index) => (
                <SkillCard 
                  key={habilidad.id}
                  habilidad={habilidad}
                  index={index}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <NewSkillModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={handleCreated}
      />

      <TrashModal
        isOpen={showTrashModal}
        onClose={() => setShowTrashModal(false)}
        type="habilidades"
        onRestored={fetchHabilidades}
      />
    </div>
  )
}
