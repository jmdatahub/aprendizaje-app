'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  CATEGORIAS_HABILIDADES, 
  EXPERIENCIA_PREVIA,
  NIVELES_HABILIDAD
} from '@/shared/constants/habilidades'
import { playClick } from '@/shared/utils/sounds'
import { useEscapeKey } from '@/shared/hooks/useEscapeKey'

interface NewSkillModalProps<T> {
  isOpen: boolean
  onClose: () => void
  onCreated: (habilidad: T) => void
}

export function NewSkillModal<T>({ isOpen, onClose, onCreated }: NewSkillModalProps<T>) {
  const [nombre, setNombre] = useState('')
  const [categorias, setCategorias] = useState<string[]>([])
  const [experiencia, setExperiencia] = useState('ninguna')
  const [horasManuales, setHorasManuales] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [nivelPercibido, setNivelPercibido] = useState('')
  const [objetivoSemanal, setObjetivoSemanal] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      const res = await fetch('/api/habilidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          categorias: categorias,
          descripcion: descripcion.trim() || null,
          experiencia_previa: experiencia,
          horas_manuales: horasManuales ? parseFloat(horasManuales) : 0,
          nivel_percibido: nivelPercibido || null,
          objetivo_semanal_minutos: objetivoSemanal ? parseInt(objetivoSemanal) * 60 : null
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
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setNombre('')
    setCategorias([])
    setExperiencia('ninguna')
    setHorasManuales('')
    setDescripcion('')
    setNivelPercibido('')
    setError('')
    onClose()
  }

  useEscapeKey(handleClose, isOpen)

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
            initial={{ scale: 0.96, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 20, opacity: 0 }}
            className="bg-card rounded-2xl shadow-xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header sticky */}
            <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-border/60 shrink-0 flex items-center justify-between gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                🎯 Nueva Habilidad
              </h2>
              <button
                type="button"
                onClick={handleClose}
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
                ¿Qué quieres aprender a hacer?
              </label>
              <Input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Tocar la guitarra, Jugar al baloncesto..."
                className="text-base"
                autoCapitalize="sentences"
                enterKeyHint="next"
                autoComplete="off"
                aria-label="Nombre de la habilidad"
                autoFocus
              />
            </div>

            {/* Categorías (multi-select) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Categorías (puedes elegir varias)
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
              {categorias.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Seleccionadas: {categorias.length}
                </p>
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
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={horasManuales}
                    onChange={e => setHorasManuales(e.target.value)}
                    placeholder="0"
                    className="w-24 text-center"
                    min="0"
                    aria-label="Horas previas"
                  />
                  <span className="text-sm text-muted-foreground">horas</span>
                </div>
              </div>
            </div>

            {/* Nivel percibido (opcional) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                ¿Cuál es tu nivel real? (opcional)
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                Las horas son una estimación. Aquí puedes indicar cómo te sientes realmente.
              </p>
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

            {/* Descripción opcional */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Objetivo personal (opcional)
              </label>
              <textarea
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="¿Qué quieres lograr? Ej: Tocar mi canción favorita..."
                className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-base md:text-sm resize-none"
                rows={2}
                autoCapitalize="sentences"
                aria-label="Objetivo personal"
              />
            </div>

            </div>

            {/* Footer sticky with buttons + safe-area */}
            <div
              className="px-5 sm:px-6 py-3 border-t border-border/60 bg-card shrink-0 space-y-2"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
            >
              {/* Error inline */}
              {error && (
                <p role="alert" className="text-red-500 text-sm">{error}</p>
              )}
              <div className="flex gap-2 sm:gap-3">
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
                  {loading ? 'Creando…' : 'Crear Habilidad'}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
