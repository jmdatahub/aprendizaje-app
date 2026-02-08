'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { PracticeTimer } from '@/features/habilidades/components/PracticeTimer'
import { SessionSummaryModal } from '@/features/habilidades/components/SessionSummaryModal'
import { 
  CATEGORIAS_HABILIDADES, 
  calcularNivel, 
  calcularProgresoNivel,
  formatearTiempo,
  NIVELES_HABILIDAD
} from '@/shared/constants/habilidades'
import { playClick } from '@/shared/utils/sounds'

interface Sesion {
  id: string
  duracion_segundos: number
  resumen: string | null
  fecha: string
}

interface Habilidad {
  id: string
  nombre: string
  categoria: string | null
  descripcion: string | null
  guia_generada: string | null
  tiempo_total_segundos: number
  nivel: string
  experiencia_previa: string
  created_at: string
  sesiones: Sesion[]
}

export default function HabilidadDetallePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  const router = useRouter()
  const [habilidad, setHabilidad] = useState<Habilidad | null>(null)
  const [loading, setLoading] = useState(true)
  const [timerActive, setTimerActive] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [savingSession, setSavingSession] = useState(false)

  useEffect(() => {
    fetchHabilidad()
  }, [id])

  const fetchHabilidad = async () => {
    try {
      const res = await fetch(`/api/habilidades/${id}`)
      const data = await res.json()
      if (data.success) {
        setHabilidad(data.data)
      } else if (data.error === 'NOT_FOUND') {
        router.push('/habilidades')
      }
    } catch (e) {
      console.error('Error fetching habilidad:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSessionEnd = (duracion: number) => {
    setSessionDuration(duracion)
    setShowSummaryModal(true)
  }

  const handleSaveSession = async (resumen: string) => {
    if (!habilidad) return

    setSavingSession(true)

    try {
      const res = await fetch(`/api/habilidades/${id}/sesiones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duracion_segundos: sessionDuration,
          resumen: resumen || null
        })
      })

      const data = await res.json()

      if (data.success) {
        // Actualizar habilidad con nuevo tiempo y sesión
        setHabilidad(prev => prev ? {
          ...prev,
          tiempo_total_segundos: data.data.nuevo_tiempo_total,
          nivel: data.data.nuevo_nivel,
          sesiones: [
            { 
              id: data.data.id, 
              duracion_segundos: sessionDuration, 
              resumen: resumen || null, 
              fecha: new Date().toISOString() 
            },
            ...prev.sesiones
          ]
        } : null)
        playClick()
      }
    } catch (e) {
      console.error('Error saving session:', e)
    } finally {
      setSavingSession(false)
      setShowSummaryModal(false)
      setSessionDuration(0)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Seguro que quieres eliminar esta habilidad? Se perderá todo el historial.')) {
      return
    }

    try {
      const res = await fetch(`/api/habilidades/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        router.push('/habilidades')
      }
    } catch (e) {
      console.error('Error deleting:', e)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!habilidad) {
    return null
  }

  const nivel = calcularNivel(habilidad.tiempo_total_segundos)
  const progreso = calcularProgresoNivel(habilidad.tiempo_total_segundos)
  const categoria = CATEGORIAS_HABILIDADES.find(c => c.id === habilidad.categoria)
  const siguienteNivel = NIVELES_HABILIDAD[NIVELES_HABILIDAD.findIndex(n => n.id === nivel.id) + 1]

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="mx-auto max-w-4xl">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6 flex justify-between items-center"
        >
          <Link href="/habilidades">
            <Button variant="outline" size="sm" className="gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Mis Habilidades
            </Button>
          </Link>

          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
          >
            🗑️ Eliminar
          </Button>
        </motion.div>

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">{categoria?.icono || '🎯'}</span>
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {categoria?.label || habilidad.categoria || 'Habilidad'}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {habilidad.nombre}
          </h1>

          {/* Nivel y stats */}
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
              <span className="text-2xl">{nivel.icono}</span>
              <span className="font-medium">{nivel.label}</span>
            </div>
            <div className="text-lg">
              <span className="text-muted-foreground">Tiempo total: </span>
              <span className="font-bold text-foreground">
                {formatearTiempo(habilidad.tiempo_total_segundos)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Progress to next level */}
        {siguienteNivel && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 max-w-md mx-auto"
          >
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Progreso a {siguienteNivel.icono} {siguienteNivel.label}</span>
              <span>{progreso}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progreso}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              {formatearTiempo((siguienteNivel.minHoras * 3600) - habilidad.tiempo_total_segundos)} para siguiente nivel
            </p>
          </motion.div>
        )}

        {/* Timer Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-3xl border border-border p-8 mb-8"
        >
          <PracticeTimer
            isActive={timerActive}
            onStart={() => setTimerActive(true)}
            onStop={() => setTimerActive(false)}
            onSessionEnd={handleSessionEnd}
          />
        </motion.div>

        {/* Descripción */}
        {habilidad.descripcion && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 p-4 bg-muted/30 rounded-xl"
          >
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Mi objetivo</h3>
            <p className="text-foreground">{habilidad.descripcion}</p>
          </motion.div>
        )}

        {/* Historial de sesiones */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            📋 Historial de práctica
            <span className="text-sm font-normal text-muted-foreground">
              ({habilidad.sesiones.length} sesiones)
            </span>
          </h2>

          {habilidad.sesiones.length === 0 ? (
            <div className="text-center py-8 bg-muted/30 rounded-xl">
              <p className="text-muted-foreground">
                Aún no tienes sesiones. ¡Inicia tu primera práctica!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {habilidad.sesiones.map((sesion, index) => (
                <motion.div
                  key={sesion.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 bg-card rounded-xl border border-border"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">⏱️</span>
                        <span className="font-semibold text-foreground">
                          {formatearTiempo(sesion.duracion_segundos)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          · {new Date(sesion.fecha).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      {sesion.resumen && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {sesion.resumen}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <SessionSummaryModal
        isOpen={showSummaryModal}
        duracionSegundos={sessionDuration}
        onSave={handleSaveSession}
        onClose={() => setShowSummaryModal(false)}
        loading={savingSession}
      />
    </div>
  )
}
