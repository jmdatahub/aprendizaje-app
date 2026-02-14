'use client'

import { useState, useEffect, use, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { PracticeTimer } from '@/features/habilidades/components/PracticeTimer'
import { SessionSummaryModal } from '@/features/habilidades/components/SessionSummaryModal'
import { ProgressChart } from '@/features/habilidades/components/ProgressChart'
import { SkillStats } from '@/features/habilidades/components/SkillStats'
import { EditSkillModal } from '@/features/habilidades/components/EditSkillModal'
import { SessionHistoryModal } from '@/features/habilidades/components/SessionHistoryModal'
import { Achievements } from '@/features/habilidades/components/Achievements'
import { ReminderSettings } from '@/features/habilidades/components/ReminderSettings'
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
  categorias: string[]
  descripcion: string | null
  guia_generada: string | null
  tiempo_total_segundos: number
  nivel: string
  nivel_percibido: string | null
  objetivo_semanal_minutos: number | null
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
  const [generatingGuide, setGeneratingGuide] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)

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

  const generateGuide = async () => {
    if (!habilidad) return
    
    setGeneratingGuide(true)
    playClick()

    try {
      const res = await fetch(`/api/habilidades/${id}/generar-guia`, {
        method: 'POST'
      })
      const data = await res.json()
      
      if (data.success) {
        setHabilidad(prev => prev ? {
          ...prev,
          guia_generada: data.data.guia
        } : null)
        setShowGuide(true)
      }
    } catch (e) {
      console.error('Error generating guide:', e)
    } finally {
      setGeneratingGuide(false)
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

  // Calcular progreso semanal si hay objetivo
  const statsSemana = useMemo(() => {
    if (!habilidad?.objetivo_semanal_minutos || !habilidad?.sesiones) return null
    
    // Obtener inicio de semana (Lunes)
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now)
    monday.setDate(diff)
    monday.setHours(0, 0, 0, 0)
    
    const segundosSemana = habilidad.sesiones.reduce((acc, s) => {
      if (new Date(s.fecha) >= monday) return acc + s.duracion_segundos
      return acc
    }, 0)
    
    return {
      actual: segundosSemana,
      meta: habilidad.objetivo_semanal_minutos * 60,
      porcentaje: Math.min((segundosSemana / (habilidad.objetivo_semanal_minutos * 60)) * 100, 100)
    }
  }, [habilidad?.sesiones, habilidad?.objetivo_semanal_minutos])

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
  const siguienteNivel = NIVELES_HABILIDAD.find(n => n.minHoras * 3600 > habilidad.tiempo_total_segundos)
  const catList = (habilidad.categorias || []).map(cid => CATEGORIAS_HABILIDADES.find(c => c.id === cid)).filter(Boolean)
  const nivelPercibidoData = habilidad.nivel_percibido ? NIVELES_HABILIDAD.find(n => n.id === habilidad.nivel_percibido) : null

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

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1"
              onClick={() => {
                playClick()
                setShowEditModal(true)
              }}
            >
              ✏️ Editar
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
            >
              🗑️ Eliminar
            </Button>
          </div>
        </motion.div>

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {/* Categorías */}
          <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
            {catList.length > 0 ? (
              catList.map(cat => (
                <span key={cat!.id} className="flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-sm">
                  <span>{cat!.icono}</span>
                  <span className="text-muted-foreground">{cat!.label}</span>
                </span>
              ))
            ) : (
              <span className="text-2xl">🎯</span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {habilidad.nombre}
          </h1>

          {/* Nivel y stats */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {/* Nivel por horas (calculado) */}
            <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
              <span className="text-2xl">{nivel.icono}</span>
              <span className="font-medium">{nivel.label}</span>
              <span className="text-xs text-muted-foreground">(por horas)</span>
            </div>
            
            {/* Nivel percibido si existe */}
            {nivelPercibidoData && (
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                <span className="text-2xl">{nivelPercibidoData.icono}</span>
                <span className="font-medium text-primary">{nivelPercibidoData.label}</span>
                <span className="text-xs text-muted-foreground">(tu nivel)</span>
              </div>
            )}
            
            <div className="text-lg">
              <span className="text-muted-foreground">Tiempo: </span>
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

        {/* Objetivo Semanal */}
        {statsSemana && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl"
          >
            <div className="flex justify-between items-end mb-2">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                🎯 Meta Semanal
              </h3>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {Math.round(statsSemana.porcentaje)}%
              </span>
            </div>
            
            <div className="flex items-end gap-2 mb-2">
              <span className="text-2xl font-bold text-foreground">
                {formatearTiempo(statsSemana.actual)}
              </span>
              <span className="text-sm text-muted-foreground mb-1">
                / {formatearTiempo(statsSemana.meta)}
              </span>
            </div>
            
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${statsSemana.porcentaje}%` }}
                transition={{ duration: 1 }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {statsSemana.actual >= statsSemana.meta 
                ? '¡Objetivo cumplido! 🎉' 
                : `Faltan ${formatearTiempo(statsSemana.meta - statsSemana.actual)} para cumplir tu meta`
              }
            </p>
          </motion.div>
        )}

        {/* Recordatorios */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <ReminderSettings habilidadId={habilidad.id} />
        </motion.div>

        {/* Estadísticas y Gráfica */}
        <div className="mb-8 space-y-4">
          <SkillStats 
            sesiones={habilidad.sesiones} 
            tiempoTotal={habilidad.tiempo_total_segundos} 
          />
          <ProgressChart sesiones={habilidad.sesiones} />
          
          <Achievements 
            sesiones={habilidad.sesiones}
            tiempoTotal={habilidad.tiempo_total_segundos}
            nivel={habilidad.nivel}
          />
        </div>

        {/* Guía de Aprendizaje IA */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8"
        >
          {!habilidad.guia_generada ? (
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6 text-center">
              <span className="text-3xl mb-3 block">✨</span>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Guía de Aprendizaje Personalizada
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                Genera una guía con IA que analiza tu progreso y te da recomendaciones específicas
              </p>
              <Button 
                onClick={generateGuide}
                disabled={generatingGuide}
                className="gap-2"
              >
                {generatingGuide ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Generando...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    Generar guía con IA
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  <span>📖</span>
                  Guía de Aprendizaje
                </span>
                <span className={`text-muted-foreground transition-transform ${showGuide ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              
              <AnimatePresence>
                {showGuide && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 pt-0 prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{habilidad.guia_generada}</ReactMarkdown>
                    </div>
                    <div className="p-4 pt-0 flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={generateGuide}
                        disabled={generatingGuide}
                        className="text-xs text-muted-foreground"
                      >
                        {generatingGuide ? 'Regenerando...' : '🔄 Regenerar guía'}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              📋 Historial reciente
            </h2>
            {habilidad.sesiones.length > 5 && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-primary hover:text-primary/80"
                onClick={() => setShowHistoryModal(true)}
              >
                Ver todo el historial ({habilidad.sesiones.length}) →
              </Button>
            )}
          </div>

          {habilidad.sesiones.length === 0 ? (
            <div className="text-center py-8 bg-muted/30 rounded-xl">
              <p className="text-muted-foreground">
                Aún no tienes sesiones. ¡Inicia tu primera práctica!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {habilidad.sesiones.slice(0, 5).map((sesion, index) => (
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

      {habilidad && (
        <EditSkillModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onUpdated={(updated) => {
            setHabilidad(prev => prev ? { ...prev, ...updated } : null)
          }}
          habilidad={{
            id: habilidad.id,
            nombre: habilidad.nombre,
            categorias: habilidad.categorias || [],
            descripcion: habilidad.descripcion,
            nivel_percibido: habilidad.nivel_percibido,
            objetivo_semanal_minutos: habilidad.objetivo_semanal_minutos
          }}
        />
      )}

      {habilidad && (
        <SessionHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          sesiones={habilidad.sesiones}
          nombreHabilidad={habilidad.nombre}
        />
      )}
    </div>
  )
}
