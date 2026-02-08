'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { formatearTiempo } from '@/shared/constants/habilidades'
import { playClick } from '@/shared/utils/sounds'

interface SessionSummaryModalProps {
  isOpen: boolean
  duracionSegundos: number
  onSave: (resumen: string) => void
  onClose: () => void
  loading?: boolean
}

export function SessionSummaryModal({ 
  isOpen, 
  duracionSegundos, 
  onSave, 
  onClose,
  loading 
}: SessionSummaryModalProps) {
  const [resumen, setResumen] = useState('')

  const handleSave = () => {
    playClick()
    onSave(resumen)
    setResumen('')
  }

  const handleSkip = () => {
    playClick()
    onSave('')
    setResumen('')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-card rounded-2xl shadow-xl max-w-md w-full p-6"
          >
            {/* Celebración */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className="text-6xl mb-3"
              >
                🎉
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                ¡Sesión completada!
              </h2>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                <span className="text-lg">⏱️</span>
                <span className="text-lg font-bold text-green-700 dark:text-green-400">
                  {formatearTiempo(duracionSegundos)}
                </span>
              </div>
            </div>

            {/* Resumen */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                ¿Qué has practicado hoy? (opcional)
              </label>
              <textarea
                value={resumen}
                onChange={e => setResumen(e.target.value)}
                placeholder="Ej: Practiqué el acorde de Sol, trabajé en transiciones..."
                className="w-full p-4 rounded-xl border border-border bg-background text-foreground text-base resize-none focus:ring-2 focus:ring-primary focus:border-primary"
                rows={4}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-2">
                💡 Escribir un resumen te ayudará a recordar tu progreso
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                onClick={handleSkip}
                disabled={loading}
                className="flex-1"
              >
                Saltar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
              >
                {loading ? 'Guardando...' : 'Guardar sesión'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
