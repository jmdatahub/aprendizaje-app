'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { playClick } from '@/shared/utils/sounds'

interface TrashItem {
  id: string
  nombre: string
  categoria?: string | null
  deleted_at: string
  dias_restantes: number
}

interface TrashModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'habilidades' | 'aprendizajes'
  onRestored?: () => void
}

export function TrashModal({ isOpen, onClose, type, onRestored }: TrashModalProps) {
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchTrash()
    }
  }, [isOpen, type])

  const fetchTrash = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/${type}/trash`)
      const data = await res.json()
      if (data.success) {
        setItems(data.data?.items || [])
      }
    } catch (e) {
      console.error('Error fetching trash:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (id: string) => {
    playClick()
    setRestoring(id)
    try {
      const res = await fetch(`/api/${type}/${id}/restore`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setItems(prev => prev.filter(i => i.id !== id))
        onRestored?.()
      }
    } catch (e) {
      console.error('Error restoring:', e)
    } finally {
      setRestoring(null)
    }
  }

  const handleClose = () => {
    playClick()
    onClose()
  }

  const titulo = type === 'habilidades' ? 'Habilidades' : 'Aprendizajes'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-card rounded-2xl shadow-xl max-w-lg w-full max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🗑️</span>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Papelera</h2>
                  <p className="text-sm text-muted-foreground">
                    {titulo} eliminados (se borran en 15 días)
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-4xl mb-2 opacity-30">✨</div>
                  <p>La papelera está vacía</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map(item => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {item.nombre || (item as any).titulo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.dias_restantes > 0 
                            ? `Se eliminará en ${item.dias_restantes} días`
                            : 'Se eliminará pronto'
                          }
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(item.id)}
                        disabled={restoring === item.id}
                        className="shrink-0 ml-2"
                      >
                        {restoring === item.id ? (
                          <span className="animate-spin">↻</span>
                        ) : (
                          '↩ Restaurar'
                        )}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border">
              <Button variant="outline" onClick={handleClose} className="w-full">
                Cerrar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
