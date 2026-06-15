'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/shared/contexts/AppContext'

export function EmptyChatSuggestions() {
  const { t } = useApp()
  const [index, setIndex] = useState(0)

  const rawSuggestions = t('chat.suggestions', { returnObjects: true }) as unknown
  const suggestions: string[] = Array.isArray(rawSuggestions) ? rawSuggestions : []

  useEffect(() => {
    if (suggestions.length === 0) return
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % suggestions.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [suggestions.length])

  if (suggestions.length === 0) return null

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 gap-6">
      {/* Visual anchor */}
      <div className="flex items-center gap-2 text-muted-foreground/25">
        <div className="w-8 h-px bg-current" />
        <span className="text-xs font-medium uppercase tracking-widest">Prueba preguntando</span>
        <div className="w-8 h-px bg-current" />
      </div>

      <div className="max-w-lg text-center px-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="text-2xl md:text-3xl font-semibold text-muted-foreground/50 tracking-tight leading-snug"
          >
            &quot;{suggestions[index]}&quot;
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Pulsing dot indicator */}
      <div className="flex items-center gap-1.5">
        {suggestions.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-500 ${
              i === index
                ? 'w-4 h-1.5 bg-muted-foreground/30'
                : 'w-1.5 h-1.5 bg-muted-foreground/15'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
