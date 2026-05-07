'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  CATEGORIAS_HABILIDADES, 
  NIVELES_HABILIDAD
} from '@/shared/constants/habilidades'
import { playClick } from '@/shared/utils/sounds'

interface EditSkillModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdated: (habilidad: any) => void
  habilidad: {
    id: string
    nombre: string
    categorias: string[]
    descripcion: string | null
    nivel_percibido: string | null
    objetivo_semanal_minutos: number | null
  }
}

export function EditSkillModal({ isOpen, onClose, onUpdated, habilidad }: EditSkillModalProps) {
  const [nombre, setNombre] = useState('')
  const [categorias, setCategorias] = useState<string[]>([])
  const [descripcion, setDescripcion] = useState('')
  const [nivelPercibido, setNivelPercibido] = useState('')
  const [objetivoSemanal, setObjetivoSemanal] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen && habilidad) {
      setNombre(habilidad.nombre || '')
      setCategorias(habilidad.categorias || [])
      setDescripcion(habilidad.descripcion || '')
      setNivelPercibido(habilidad.nivel_percibido || '')
      setObjetivoSemanal(habilidad.objetivo_semanal_minutos ? (habilidad.objetivo_semanal_minutos / 60).toString() : '')
    }
  }, [isOpen, habilidad])

  const toggleCategoria = (catId: string) => {
    playClick()
    setCategorias(prev => 
      prev.includes(catId) 
        ? prev.filter(c => c !== catId)
        : [...prev, catId]
    )
  }

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/habilidades/${habilidad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          categorias,
          descripcion: descripcion.trim() || null,
          nivel_percibido: nivelPercibido || null,
          objetivo_semanal_minutos: objetivoSemanal ? Math.round(parseFloat(objetivoSemanal) * 60) : null
        })
      })

      const data = await res.json()

      if (data.success) {
        playClick()
        onUpdated(data.data)
        onClose()
      } else {
        setError(data.message || 'Error al actualizar')
      }
    } catch (e) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

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
            initial={{ scale: 0.96, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 20, opacity: 0 }}
            className="bg-card rounded-2xl shadow-xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header sticky */}
            <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-border/60 shrink-0 flex items-center justify-between gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                ✏️ Editar Habilidad
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="-mr-2 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 min-w-[40px] min-h-[40px] flex items-center justify-center transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body scrollable */}
            <div className="px-5 sm:px-6 py-5 overflow-y-auto flex-1 overscroll-contain">

            {/* Nombre */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Nombre
              </label>
              <Input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Nombre de la habilidad"
                className="text-base"
              />
            </div>

            {/* Categorías (multi-select) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Categorías
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIAS_HABILIDADES.filter(c => c.id !== 'otra').map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategoria(cat.id)}
                    className={`px-3 py-2 rounded-full border text-sm transition-all flex items-center gap-1.5 ${
                      categorias.includes(cat.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 hover:bg-muted border-border'
                    }`}
                  >
                    <span>{cat.icono}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nivel percibido */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Tu nivel real (opcional)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playClick()
                    setNivelPercibido('')
                  }}
                  className={`px-3 py-2 rounded-full border text-sm transition-all ${
                    nivelPercibido === ''
                      ? 'bg-muted border-border text-foreground'
                      : 'bg-muted/30 hover:bg-muted border-border text-muted-foreground'
                  }`}
                >
                  Automático
                </button>
                {NIVELES_HABILIDAD.map(nivel => (
                  <button
                    key={nivel.id}
                    type="button"
                    onClick={() => {
                      playClick()
                      setNivelPercibido(nivel.id)
                    }}
                    className={`px-3 py-2 rounded-full border text-sm transition-all flex items-center gap-1.5 ${
                      nivelPercibido === nivel.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/30 hover:bg-muted border-border text-muted-foreground'
                    }`}
                  >
                    <span>{nivel.icono}</span>
                    <span>{nivel.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Objetivo Semanal */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Meta semanal (horas)
              </label>
              <Input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={objetivoSemanal}
                onChange={e => setObjetivoSemanal(e.target.value)}
                placeholder="Ej: 3"
                min="0"
                className="w-full"
                aria-label="Meta semanal en horas"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Opcional. Define cuántas horas quieres practicar a la semana.
              </p>
            </div>

            {/* Descripción */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Objetivo personal (opcional)
              </label>
              <textarea
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="¿Qué quieres lograr?"
                className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-sm resize-none"
                rows={2}
              />
            </div>

            </div>

            {/* Footer sticky with buttons + safe-area */}
            <div
              className="px-5 sm:px-6 py-3 border-t border-border/60 bg-card shrink-0 space-y-2"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
            >
              {error && (
                <p role="alert" className="text-red-500 text-sm">{error}</p>
              )}
              <div className="flex gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !nombre.trim()}
                  className="flex-1"
                >
                  {loading ? 'Guardando…' : 'Guardar cambios'}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
