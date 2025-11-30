'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/shared/contexts/AppContext'



export function EmptyChatSuggestions() {
  const { t } = useApp()
  const [index, setIndex] = useState(0)
  
  const suggestions = (t('chat.suggestions', { returnObjects: true }) as unknown) as string[];

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % suggestions.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
      <div className="max-w-lg text-center px-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="text-3xl md:text-4xl font-semibold text-muted-foreground/30 tracking-tight leading-tight"
          >
            {suggestions[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
