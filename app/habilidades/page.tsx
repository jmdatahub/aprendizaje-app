'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { SkillCard } from '@/features/habilidades/components/SkillCard'
import { NewSkillModal } from '@/features/habilidades/components/NewSkillModal'
import { TrashModal } from '@/shared/components/TrashModal'
import { SkeletonCard } from '@/shared/components'
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
  // Campos que ya devuelve la API (select * sobre la tabla habilidades)
  descripcion?: string | null
  updated_at?: string
  objetivo_semanal_minutos?: number | null
}

// Umbral en días para considerar una habilidad "dormida"
const DIAS_DORMIDA = 30

// Días enteros transcurridos desde una fecha ISO hasta hoy, o null si no es válida
function diasDesdeISO(fechaISO: string | null | undefined): number | null {
  if (!fechaISO) return null
  const fecha = new Date(fechaISO)
  if (isNaN(fecha.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - fecha.getTime()) / (1000 * 60 * 60 * 24)))
}

export default function HabilidadesPage() {
  const [habilidades, setHabilidades] = useState<Habilidad[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showTrashModal, setShowTrashModal] = useState(false)
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('creacion-desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [soloRacha, setSoloRacha] = useState(false)
  const [soloDormidas, setSoloDormidas] = useState(false)
  const [soloMeta, setSoloMeta] = useState(false)

  useEffect(() => {
    fetchHabilidades()
  }, [])

  const fetchHabilidades = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/habilidades')
      const data = await res.json()
      if (data.success) {
        setHabilidades(data.data.items || [])
      } else {
        // API reachable but returned an error (e.g. DB down) — surface it instead
        // of falling through to the "empty" state, which would imply data loss.
        setError(true)
      }
    } catch (e) {
      console.error('Error fetching habilidades:', e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleCreated = (nuevaHabilidad: Habilidad) => {
    setHabilidades(prev => [nuevaHabilidad, ...prev])
  }

  // Filtrado por categoría + búsqueda + filtros de estado (solo cliente)
  const filteredHabilidades = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return habilidades.filter(h => {
      // Categoría
      if (filtroCategoria && !(h.categorias || []).includes(filtroCategoria)) return false

      // Búsqueda por nombre + descripción
      if (q) {
        const enNombre = h.nombre.toLowerCase().includes(q)
        const enDescripcion = (h.descripcion || '').toLowerCase().includes(q)
        if (!enNombre && !enDescripcion) return false
      }

      // Estado: dormida (>30d sin práctica, usando updated_at como proxy)
      const diasInactiva = diasDesdeISO(h.updated_at ?? h.created_at)
      const dormida = diasInactiva !== null && diasInactiva > DIAS_DORMIDA
      if (soloDormidas && !dormida) return false

      // Estado: racha activa (practicó hoy o ayer, según updated_at)
      const rachaActiva = diasInactiva !== null && diasInactiva <= 1
      if (soloRacha && !rachaActiva) return false

      // Estado: con meta semanal definida
      if (soloMeta && !(h.objetivo_semanal_minutos && h.objetivo_semanal_minutos > 0)) return false

      return true
    })
  }, [habilidades, filtroCategoria, searchQuery, soloDormidas, soloRacha, soloMeta])

  const sortedHabilidades = useMemo(() => {
    return [...filteredHabilidades].sort((a, b) => {
      switch (sortBy) {
        case 'nombre-asc':
          return a.nombre.localeCompare(b.nombre)
        case 'nombre-desc':
          return b.nombre.localeCompare(a.nombre)
        case 'tiempo-desc':
          return b.tiempo_total_segundos - a.tiempo_total_segundos
        case 'tiempo-asc':
          return a.tiempo_total_segundos - b.tiempo_total_segundos
        case 'practica-asc': {
          // "Últimas practicadas": las dormidas (menos recientes) primero,
          // usando updated_at como proxy de la última práctica.
          const fa = new Date(a.updated_at ?? a.created_at).getTime()
          const fb = new Date(b.updated_at ?? b.created_at).getTime()
          return fa - fb
        }
        case 'creacion-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'creacion-desc':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
  }, [filteredHabilidades, sortBy])

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
    <div className="min-h-screen bg-background p-3 sm:p-6 md:p-12 pb-mobile-nav">
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
          className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
              🎯 Mis Habilidades
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Practica y mide tu progreso en habilidades prácticas
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                playClick()
                setShowTrashModal(true)
              }}
              className="gap-1 flex-1 sm:flex-none"
            >
              🗑️ Papelera
            </Button>
            <Button
              size="sm"
              onClick={() => {
                playClick()
                setShowNewModal(true)
              }}
              className="gap-2 flex-1 sm:flex-none"
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
            className="mb-6 -mx-3 sm:mx-0 px-3 sm:px-0 flex gap-2 overflow-x-auto sm:flex-wrap scrollbar-hide pb-1 sm:pb-0"
          >
            <button
              onClick={() => {
                playClick()
                setFiltroCategoria(null)
              }}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
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
                  className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
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

        {/* Búsqueda + filtros de estado */}
        {habilidades.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 space-y-3"
          >
            {/* Search box */}
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o descripción..."
                aria-label="Buscar habilidades"
                className="w-full min-h-[40px] pl-10 pr-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>

            {/* Filtros de estado */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'racha', label: '🔥 Solo con racha activa', value: soloRacha, set: setSoloRacha },
                { key: 'dormidas', label: '💤 Solo dormidas >30d', value: soloDormidas, set: setSoloDormidas },
                { key: 'meta', label: '🎯 Solo con meta semanal', value: soloMeta, set: setSoloMeta },
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  role="checkbox"
                  aria-checked={f.value}
                  onClick={() => {
                    playClick()
                    f.set(!f.value)
                  }}
                  className={`min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    f.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground border-transparent'
                  }`}
                >
                  <span aria-hidden="true">{f.value ? '☑' : '☐'}</span>
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando habilidades</span>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            role="alert"
            className="text-center py-20 bg-card rounded-3xl border border-dashed border-destructive/40"
          >
            <div className="text-6xl mb-4 opacity-40">⚠️</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No se pudieron cargar tus habilidades
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Hubo un problema al conectar con el servidor. Tus datos están a salvo; inténtalo de nuevo.
            </p>
            <Button
              onClick={() => {
                playClick()
                fetchHabilidades()
              }}
              size="lg"
              className="gap-2"
            >
              ↻ Reintentar
            </Button>
          </motion.div>
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
            {searchQuery.trim() || soloRacha || soloDormidas || soloMeta
              ? 'Ninguna habilidad coincide con tu búsqueda o filtros'
              : 'No tienes habilidades en esta categoría'}
          </div>
        ) : (
          <>
            {/* Barra de herramientas: Ordenar + Exportar */}
            {habilidades.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center mb-6 gap-3 sm:gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="hidden sm:inline text-sm text-muted-foreground shrink-0">Ordenar por:</span>
                  <Select
                    value={sortBy}
                    onValueChange={(value) => {
                      playClick()
                      setSortBy(value)
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creacion-desc">Más recientes</SelectItem>
                      <SelectItem value="creacion-asc">Más antiguas</SelectItem>
                      <SelectItem value="tiempo-desc">Más practicadas</SelectItem>
                      <SelectItem value="tiempo-asc">Menos practicadas</SelectItem>
                      <SelectItem value="practica-asc">Últimas practicadas</SelectItem>
                      <SelectItem value="nombre-asc">Nombre (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="gap-2 w-full sm:w-auto"
                >
                  <span>📥</span>
                  Exportar CSV
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
