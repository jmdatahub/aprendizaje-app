'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { playClick, playSuccess } from '@/shared/utils/sounds'

interface Reminder {
  id: string
  dia_semana: number
  hora: string
  active: boolean
}

const DIAS = [
  { id: 1, label: 'L', name: 'Lunes' },
  { id: 2, label: 'M', name: 'Martes' },
  { id: 3, label: 'X', name: 'Miércoles' },
  { id: 4, label: 'J', name: 'Jueves' },
  { id: 5, label: 'V', name: 'Viernes' },
  { id: 6, label: 'S', name: 'Sábado' },
  { id: 0, label: 'D', name: 'Domingo' },
]

export function ReminderSettings({ habilidadId }: { habilidadId: string }) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [time, setTime] = useState('18:00')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchReminders()
  }, [habilidadId])

  const fetchReminders = async () => {
    try {
      const res = await fetch(`/api/recordatorios?habilidad_id=${habilidadId}`)
      const data = await res.json()
      if (data.success) {
        setReminders(data.data)
      }
    } catch (e) {
      console.error('Error loading reminders', e)
    } finally {
      setLoading(false)
    }
  }

  const toggleDay = (dayId: number) => {
    playClick()
    setSelectedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    )
  }

  const handleAdd = async () => {
    if (selectedDays.length === 0 || !time) return
    
    setAdding(true)
    playClick()

    try {
      // Crear uno por cada día seleccionado
      const promises = selectedDays.map(dia => 
        fetch('/api/recordatorios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            habilidad_id: habilidadId,
            dia_semana: dia,
            hora: time
          })
        })
      )

      await Promise.all(promises)
      
      playSuccess()
      setSelectedDays([])
      await fetchReminders()
    } catch (e) {
      console.error('Error adding reminder', e)
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar recordatorio?')) return
    
    try {
      await fetch(`/api/recordatorios/${id}`, { method: 'DELETE' })
      setReminders(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      console.error('Error deleting reminder', e)
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🔔</span>
        <h3 className="font-semibold text-foreground">Recordatorios</h3>
      </div>

      <div className="mb-6 p-4 bg-muted/30 rounded-xl border border-border/50">
        <label className="block text-sm font-medium mb-3">Nuevo recordatorio:</label>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {DIAS.map(dia => (
            <button
              key={dia.id}
              onClick={() => toggleDay(dia.id)}
              className={`
                w-8 h-8 rounded-full text-xs font-bold transition-all
                ${selectedDays.includes(dia.id)
                  ? 'bg-primary text-primary-foreground scale-110 shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }
              `}
              title={dia.name}
            >
              {dia.label}
            </button>
          ))}
        </div>
        
        <div className="flex gap-2">
          <Input 
            type="time" 
            value={time}
            onChange={e => setTime(e.target.value)}
            className="w-32"
          />
          <Button 
            onClick={handleAdd}
            disabled={adding || selectedDays.length === 0}
            size="sm"
          >
            {adding ? 'Guardando...' : 'Añadir'}
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        <AnimatePresence>
          {reminders.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin recordatorios activos
            </p>
          ) : (
            reminders.map(reminder => (
              <motion.div
                key={reminder.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between p-3 bg-muted/20 rounded-lg text-sm group"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">
                    {DIAS.find(d => d.id === reminder.dia_semana)?.name}
                  </span>
                  <span className="text-foreground font-mono">
                    {reminder.hora.slice(0, 5)}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(reminder.id)}
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  title="Eliminar"
                >
                  ✕
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
