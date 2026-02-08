'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  CATEGORIAS_HABILIDADES, 
  EXPERIENCIA_PREVIA 
} from '@/shared/constants/habilidades'
import { playClick } from '@/shared/utils/sounds'

interface NewSkillModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (habilidad: any) => void
}

export function NewSkillModal({ isOpen, onClose, onCreated }: NewSkillModalProps) {
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('')
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState('')
  const [experiencia, setExperiencia] = useState('ninguna')
  const [horasManuales, setHorasManuales] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    setLoading(true)
    setError('')

    try {
      const categoriaFinal = categoria === 'otra' ? categoriaPersonalizada : categoria

      const res = await fetch('/api/habilidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          categoria: categoriaFinal || null,
          descripcion: descripcion.trim() || null,
          experiencia_previa: experiencia,
          horas_manuales: horasManuales ? parseFloat(horasManuales) : null
        })
      })

      const data = await res.json()

      if (data.success) {
        playClick()
        onCreated(data.data)
        handleClose()
      } else {
        setError(data.message || 'Error al crear habilidad')
      }
    } catch (e) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setNombre('')
    setCategoria('')
    setCategoriaPersonalizada('')
    setExperiencia('ninguna')
    setHorasManuales('')
    setDescripcion('')
    setError('')
    onClose()
  }

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
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              🎯 Nueva Habilidad
            </h2>

            {/* Nombre */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                ¿Qué quieres aprender a hacer?
              </label>
              <Input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Tocar la guitarra, Jugar al baloncesto..."
                className="text-base"
                autoFocus
              />
            </div>

            {/* Categoría */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Categoría
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIAS_HABILIDADES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      playClick()
                      setCategoria(cat.id)
                    }}
                    className={`p-2 rounded-lg border text-sm transition-all ${
                      categoria === cat.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 hover:bg-muted border-border'
                    }`}
                  >
                    <span className="text-lg">{cat.icono}</span>
                    <span className="block text-xs mt-1">{cat.label}</span>
                  </button>
                ))}
              </div>
              
              {categoria === 'otra' && (
                <Input
                  value={categoriaPersonalizada}
                  onChange={e => setCategoriaPersonalizada(e.target.value)}
                  placeholder="Escribe tu categoría..."
                  className="mt-2"
                />
              )}
            </div>

            {/* Experiencia previa */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                ¿Cuánta experiencia tienes ya?
              </label>
              <div className="space-y-2">
                {EXPERIENCIA_PREVIA.map(exp => (
                  <button
                    key={exp.id}
                    onClick={() => {
                      playClick()
                      setExperiencia(exp.id)
                      setHorasManuales('') // Limpiar si selecciona preset
                    }}
                    className={`w-full p-3 rounded-lg border text-left text-sm transition-all flex items-center gap-3 ${
                      experiencia === exp.id && !horasManuales
                        ? 'bg-primary/10 border-primary text-foreground'
                        : 'bg-muted/30 hover:bg-muted border-border text-muted-foreground'
                    }`}
                  >
                    <span className="text-xl">{exp.icono}</span>
                    <span>{exp.label}</span>
                    {exp.horas > 0 && (
                      <span className="ml-auto text-xs opacity-60">~{exp.horas}h</span>
                    )}
                  </button>
                ))}
              </div>
              
              {/* Horas manuales */}
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">O escribe las horas exactas:</span>
                  <Input
                    type="number"
                    value={horasManuales}
                    onChange={e => setHorasManuales(e.target.value)}
                    placeholder="0"
                    className="w-24 text-center"
                    min="0"
                  />
                  <span className="text-sm text-muted-foreground">horas</span>
                </div>
              </div>
            </div>

            {/* Descripción opcional */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Objetivo personal (opcional)
              </label>
              <textarea
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="¿Qué quieres lograr? Ej: Tocar mi canción favorita..."
                className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-sm resize-none"
                rows={2}
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-500 text-sm mb-4">{error}</p>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={loading || !nombre.trim()}
                className="flex-1"
              >
                {loading ? 'Creando...' : 'Crear Habilidad'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
