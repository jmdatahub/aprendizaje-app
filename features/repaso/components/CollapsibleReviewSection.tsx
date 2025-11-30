import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { playClick } from '@/shared/utils/sounds'

interface Item {
  id: string
  title: string
  summary: string
  date: string
  sectorId: string
  sectorName: string
  sectorIcon: string
}

interface CollapsibleReviewSectionProps {
  items: Item[]
}

export function CollapsibleReviewSection({ items }: CollapsibleReviewSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  if (items.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <div className="rounded-2xl overflow-hidden border border-red-200 bg-red-50/30 shadow-sm">
        {/* Header */}
        <button
          onClick={() => {
            playClick()
            setIsOpen(!isOpen)
          }}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-white hover:bg-red-50/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ 
                scale: [1, 1.15, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }}
              className="text-2xl"
            >
              ⏰
            </motion.div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                Aprendizajes pendientes de repaso
                <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full border border-red-200">
                  {items.length} pendientes
                </span>
              </h2>
              <p className="text-[10px] text-gray-500">
                {isOpen ? 'Pulsa para ocultar' : 'Pulsa para ver qué tienes pendiente'}
              </p>
            </div>
          </div>
          
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </button>

        {/* Body */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="p-4 border-t border-red-100 bg-white/50">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(item => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white p-3 rounded-xl border border-red-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                    >
                      {/* Subtle glow effect */}
                      <div className="absolute inset-0 bg-red-50/0 group-hover:bg-red-50/30 transition-colors pointer-events-none" />
                      
                      <div className="flex items-center justify-between mb-2 relative z-10">
                        <span className="text-[10px] font-medium text-gray-500 uppercase bg-gray-50 px-1.5 py-0.5 rounded">
                          {item.sectorName}
                        </span>
                        <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                          Repasar
                        </span>
                      </div>
                      
                      <h3 className="text-sm font-bold text-gray-800 mb-2 line-clamp-1 relative z-10">
                        {item.title}
                      </h3>
                      
                      <div className="relative z-10">
                        <Link href={`/aprender?mode=review&tema=${encodeURIComponent(item.title)}&sector=${encodeURIComponent(item.sectorName)}&autostart=true`}>
                          <Button 
                            size="sm" 
                            className="w-full h-8 text-xs bg-white text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 shadow-sm"
                            onClick={() => playClick()}
                          >
                            Repasar ahora
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
