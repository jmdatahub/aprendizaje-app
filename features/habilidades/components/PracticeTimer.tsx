'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { playClick } from '@/shared/utils/sounds'

interface PracticeTimerProps {
  onSessionEnd: (duracionSegundos: number) => void
  isActive: boolean
  onStart: () => void
  onStop: () => void
}

export function PracticeTimer({ onSessionEnd, isActive, onStart, onStop }: PracticeTimerProps) {
  const [segundos, setSegundos] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (isActive) {
      startTimeRef.current = Date.now() - (segundos * 1000)
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
          setSegundos(elapsed)
        }
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isActive])

  const handleStart = () => {
    playClick()
    setSegundos(0)
    onStart()
  }

  const handleStop = () => {
    playClick()
    onStop()
    if (segundos > 0) {
      onSessionEnd(segundos)
    }
    setSegundos(0)
  }

  // Formatear tiempo
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col items-center">
      {/* Timer Display */}
      <motion.div
        className={`relative w-48 h-48 md:w-64 md:h-64 rounded-full flex items-center justify-center mb-6 ${
          isActive 
            ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/50' 
            : 'bg-muted/50 border-2 border-border'
        }`}
        animate={isActive ? { 
          boxShadow: ['0 0 0 0 rgba(34, 197, 94, 0.4)', '0 0 0 20px rgba(34, 197, 94, 0)']
        } : {}}
        transition={isActive ? { 
          duration: 1.5, 
          repeat: Infinity 
        } : {}}
      >
        {/* Pulsing ring when active */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-green-500"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </AnimatePresence>

        <div className="text-center">
          <motion.div 
            className={`font-mono font-bold ${
              isActive ? 'text-4xl md:text-5xl text-green-500' : 'text-3xl md:text-4xl text-muted-foreground'
            }`}
            key={segundos}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.1 }}
          >
            {formatTime(segundos)}
          </motion.div>
          
          <p className={`text-sm mt-2 ${isActive ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
            {isActive ? '⏱️ En progreso...' : 'Listo para practicar'}
          </p>
        </div>
      </motion.div>

      {/* Control Button */}
      <AnimatePresence mode="wait">
        {!isActive ? (
          <motion.div
            key="start"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Button
              onClick={handleStart}
              size="lg"
              className="text-lg px-8 py-6 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all gap-2"
            >
              <span>▶️</span>
              Iniciar práctica
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="stop"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Button
              onClick={handleStop}
              size="lg"
              variant="destructive"
              className="text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all gap-2"
            >
              <span>⏹️</span>
              Terminar sesión
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tip */}
      {isActive && (
        <motion.p 
          className="mt-4 text-xs text-muted-foreground text-center max-w-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          💡 El cronómetro sigue corriendo aunque cierres la app. 
          Ve a practicar y vuelve cuando termines.
        </motion.p>
      )}
    </div>
  )
}
