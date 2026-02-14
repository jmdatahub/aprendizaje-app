'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { formatearTiempo } from '@/shared/constants/habilidades'

interface Sesion {
  id: string
  duracion_segundos: number
  resumen: string | null
  fecha: string
}

interface SessionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  sesiones: Sesion[]
  nombreHabilidad: string
}

export function SessionHistoryModal({ 
  isOpen, 
  onClose, 
  sesiones, 
  nombreHabilidad 
}: SessionHistoryModalProps) {
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} días`
    return null
  }

  // Ordenar por fecha descendente
  const sortedSesiones = [...sesiones].sort((a, b) => 
    new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-card rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  📅 Historial de Sesiones
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {nombreHabilidad} • {sesiones.length} sesiones
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {sortedSesiones.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <span className="text-4xl mb-3 block">📭</span>
                  <p>Aún no hay sesiones registradas</p>
                  <p className="text-sm mt-1">¡Empieza a practicar!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedSesiones.map((sesion, index) => {
                    const relativeDate = getRelativeDate(sesion.fecha)
                    
                    return (
                      <motion.div
                        key={sesion.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="p-4 bg-muted/50 rounded-xl border border-border"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">⏱️</span>
                            <span className="font-bold text-foreground">
                              {formatearTiempo(sesion.duracion_segundos)}
                            </span>
                          </div>
                          <div className="text-right">
                            {relativeDate && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {relativeDate}
                              </span>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(sesion.fecha)}
                            </p>
                          </div>
                        </div>
                        
                        {sesion.resumen && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            💭 {sesion.resumen}
                          </p>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer stats */}
            {sesiones.length > 0 && (
              <div className="p-4 border-t border-border bg-muted/30 flex justify-around text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {formatearTiempo(sesiones.reduce((acc, s) => acc + s.duracion_segundos, 0))}
                  </p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {sesiones.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Sesiones</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {formatearTiempo(Math.round(sesiones.reduce((acc, s) => acc + s.duracion_segundos, 0) / sesiones.length))}
                  </p>
                  <p className="text-xs text-muted-foreground">Promedio</p>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
