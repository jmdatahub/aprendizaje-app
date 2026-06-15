'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  CATEGORIAS_HABILIDADES,
  calcularNivel,
  calcularProgresoNivel,
  formatearTiempo
} from '@/shared/constants/habilidades'
import { calculateGamificationStats } from '@/shared/utils/gamification'
import { playClick } from '@/shared/utils/sounds'

interface SesionResumen {
  fecha: string
}

interface SkillCardProps {
  habilidad: {
    id: string
    nombre: string
    categorias: string[]
    tiempo_total_segundos: number
    nivel: string
    created_at: string
    // Opcionales: cuando están disponibles se enriquece la tarjeta con
    // badges de engagement y de "dormida". En la lista solo llega updated_at
    // (proxy de la última práctica); las sesiones se pasan si existen.
    updated_at?: string
    sesiones?: SesionResumen[]
  }
  index: number
}

// Umbral en días para considerar una habilidad "dormida" (sin práctica reciente)
const DIAS_DORMIDA = 30

// Devuelve los días enteros transcurridos desde una fecha hasta hoy (>=0), o null
function diasDesde(fechaISO: string | null | undefined): number | null {
  if (!fechaISO) return null
  const fecha = new Date(fechaISO)
  if (isNaN(fecha.getTime())) return null
  const diff = Date.now() - fecha.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function formatUltimaPractica(dias: number): string {
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  if (dias < 7) return `Hace ${dias}d`
  if (dias < 30) return `Hace ${Math.floor(dias / 7)} sem`
  return `Hace ${Math.floor(dias / 30)} mes${Math.floor(dias / 30) > 1 ? 'es' : ''}`
}

export function SkillCard({ habilidad, index }: SkillCardProps) {
  const nivel = calcularNivel(habilidad.tiempo_total_segundos)
  const progreso = calcularProgresoNivel(habilidad.tiempo_total_segundos)
  const catList = (habilidad.categorias || []).map(cid => CATEGORIAS_HABILIDADES.find(c => c.id === cid)).filter(Boolean)

  // Última práctica: usar la sesión más reciente si está disponible,
  // si no, recurrir a updated_at (que se actualiza al guardar una sesión).
  const fechasSesiones = (habilidad.sesiones || []).map(s => s.fecha)
  const ultimaSesionISO = fechasSesiones.length > 0
    ? fechasSesiones.reduce((max, f) => (new Date(f) > new Date(max) ? f : max), fechasSesiones[0])
    : (habilidad.updated_at ?? null)

  const diasInactiva = diasDesde(ultimaSesionISO)
  const estaDormida = diasInactiva !== null && diasInactiva > DIAS_DORMIDA

  // Racha actual: solo se puede calcular si tenemos las fechas de sesiones.
  const racha = fechasSesiones.length > 0
    ? calculateGamificationStats(fechasSesiones).currentStreak
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02, y: -4 }}
    >
      <Link
        href={`/habilidades/${habilidad.id}`}
        onClick={() => playClick()}
      >
        <div className={`group bg-card rounded-2xl p-5 border transition-all shadow-sm hover:shadow-md h-full flex flex-col ${
          estaDormida
            ? 'border-red-500/30 hover:border-red-500/50'
            : 'border-border hover:border-primary/30'
        }`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-1">
              {catList.length > 0 ? (
                catList.map(cat => (
                  <span key={cat!.id} className="text-xl" title={cat!.label}>
                    {cat!.icono}
                  </span>
                ))
              ) : (
                <>
                  <span className="text-2xl">🎯</span>
                  <span className="text-xs font-medium text-muted-foreground">Sin categoría</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-full">
              <span className="text-sm">{nivel.icono}</span>
              <span className="text-xs font-medium text-muted-foreground">
                {nivel.label}
              </span>
            </div>
          </div>

          {/* Nombre + badges de engagement */}
          <div className="mb-2">
            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {habilidad.nombre}
            </h3>
            {(racha > 0 || diasInactiva !== null) && (
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                {racha > 0 && (
                  <span
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    aria-label={`Racha actual: ${racha} ${racha === 1 ? 'día' : 'días'}`}
                  >
                    🔥{racha}
                  </span>
                )}
                {diasInactiva !== null && (
                  <span
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground"
                    aria-label={`Última práctica: ${formatUltimaPractica(diasInactiva)}`}
                  >
                    📅{formatUltimaPractica(diasInactiva)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Badge de habilidad dormida */}
          {estaDormida && diasInactiva !== null && (
            <div
              className="mb-2 inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
              aria-label={`Habilidad dormida: ${diasInactiva} días sin práctica`}
            >
              💤 Dormida hace {diasInactiva} días
            </div>
          )}

          {/* Stats */}
          <div className="mt-auto pt-3 space-y-2">
            {/* Tiempo total */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tiempo total:</span>
              <span className="font-semibold text-foreground">
                {formatearTiempo(habilidad.tiempo_total_segundos)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progreso a {nivel.id === 'maestro' ? 'Maestro' : 'siguiente nivel'}</span>
                <span>{progreso}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progreso}%` }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                />
              </div>
            </div>

            {/* Fecha inicio */}
            <div className="pt-2 mt-2 border-t border-border/50 text-[10px] text-muted-foreground flex justify-between">
              <span>Iniciado:</span>
              <span>{new Date(habilidad.created_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Call to action */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            <span>▶️</span>
            <span>Iniciar práctica</span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
