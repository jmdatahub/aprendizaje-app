'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  CATEGORIAS_HABILIDADES, 
  calcularNivel, 
  calcularProgresoNivel,
  formatearTiempo 
} from '@/shared/constants/habilidades'
import { playClick } from '@/shared/utils/sounds'

interface SkillCardProps {
  habilidad: {
    id: string
    nombre: string
    categorias: string[]
    tiempo_total_segundos: number
    nivel: string
    created_at: string
  }
  index: number
}

export function SkillCard({ habilidad, index }: SkillCardProps) {
  const nivel = calcularNivel(habilidad.tiempo_total_segundos)
  const progreso = calcularProgresoNivel(habilidad.tiempo_total_segundos)
  const catList = (habilidad.categorias || []).map(cid => CATEGORIAS_HABILIDADES.find(c => c.id === cid)).filter(Boolean)

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
        <div className="group bg-card rounded-2xl p-5 border border-border hover:border-primary/30 transition-all shadow-sm hover:shadow-md h-full flex flex-col">
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

          {/* Nombre */}
          <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
            {habilidad.nombre}
          </h3>

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
