'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const sectionTitles = [
  "Salud y Rendimiento",
  "Ciencias Naturales",
  "Física Cuántica",
  "Matemáticas",
  "Tecnología",
  "Historia",
  "Arte y Cultura",
  "Economía",
  "Psicología"
]

export default function DiceAnimation() {
  const [phase, setPhase] = useState<'dice' | 'explosion' | 'puzzle'>('dice')

  useEffect(() => {
    // Collision at 3s
    const collisionTimer = setTimeout(() => setPhase('explosion'), 3000)
    
    // Puzzle at 3.5s
    const puzzleTimer = setTimeout(() => setPhase('puzzle'), 3500)
    
    return () => {
      clearTimeout(collisionTimer)
      clearTimeout(puzzleTimer)
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 overflow-hidden">
      {/* Dice Phase */}
      {phase === 'dice' && (
        <>
          {/* Dice 1 - From bottom-left */}
          <motion.div
            className="absolute"
            initial={{ x: -300, y: 400, rotateX: 0, rotateY: 0, rotateZ: -45, opacity: 0 }}
            animate={{ 
              x: 'calc(50vw - 60px)', 
              y: 'calc(50vh - 60px)', 
              rotateX: 1440, 
              rotateY: 1080, 
              rotateZ: 720,
              opacity: 1
            }}
            transition={{ duration: 3, ease: [0.34, 0.61, 0.45, 0.98] }}
            style={{ 
              transformStyle: 'preserve-3d',
              perspective: 1000
            }}
          >
            <Dice3D />
          </motion.div>

          {/* Dice 2 - From top-right */}
          <motion.div
            className="absolute"
            initial={{ x: 300, y: -400, rotateX: 0, rotateY: 0, rotateZ: 45, opacity: 0 }}
            animate={{ 
              x: 'calc(50vw - 60px)', 
              y: 'calc(50vh - 60px)', 
              rotateX: -1440, 
              rotateY: -1080, 
              rotateZ: -720,
              opacity: 1
            }}
            transition={{ duration: 3, ease: [0.34, 0.61, 0.45, 0.98] }}
            style={{ 
              transformStyle: 'preserve-3d',
              perspective: 1000
            }}
          >
            <Dice3D />
          </motion.div>
        </>
      )}

      {/* Explosion Phase */}
      {phase === 'explosion' && (
        <>
          {/* Flash */}
          <motion.div
            className="absolute left-1/2 top-1/2 w-64 h-64 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,200,100,0.5) 40%, transparent 70%)',
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 8, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
          
          {/* Particles */}
          {Array.from({ length: 50 }).map((_, i) => {
            const angle = (Math.PI * 2 * i) / 50
            const distance = 200 + Math.random() * 100
            return (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2 rounded-full"
                style={{
                  width: Math.random() * 8 + 4,
                  height: Math.random() * 8 + 4,
                  background: `hsl(${Math.random() * 60 + 20}, 100%, 60%)`
                }}
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ 
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance,
                  opacity: 0
                }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            )
          })}
        </>
      )}

      {/* Puzzle Phase */}
      {phase === 'puzzle' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="grid grid-cols-3 gap-2"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {sectionTitles.map((title, i) => (
              <motion.div
                key={i}
                className="w-36 h-36 rounded-xl flex items-center justify-center text-center font-bold text-sm p-4"
                style={{
                  background: 'linear-gradient(135deg, #f0f0f0 0%, #c8c8c8 25%, #a8a8a8 50%, #c8c8c8 75%, #f0f0f0 100%)',
                  border: '3px solid #888',
                  boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.6), inset 0 -2px 10px rgba(0,0,0,0.3), 0 10px 30px rgba(0,0,0,0.6)',
                  color: '#1a1a1a',
                  textShadow: '0 1px 2px rgba(255,255,255,0.5)'
                }}
                initial={{ 
                  x: (Math.random() - 0.5) * 600,
                  y: (Math.random() - 0.5) * 600,
                  rotate: Math.random() * 720 - 360,
                  scale: 0,
                  opacity: 0
                }}
                animate={{ 
                  x: 0,
                  y: 0,
                  rotate: 0,
                  scale: 1,
                  opacity: 1
                }}
                transition={{ 
                  delay: i * 0.12,
                  duration: 0.6,
                  ease: [0.68, -0.55, 0.265, 1.55]
                }}
              >
                {title}
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  )
}

// 3D Dice Component
function Dice3D() {
  return (
    <div 
      className="relative"
      style={{ 
        width: 120, 
        height: 120,
        transformStyle: 'preserve-3d'
      }}
    >
      {/* Front - 1 dot */}
      <div className="dice-face" style={{ transform: 'rotateY(0deg) translateZ(60px)' }}>
        <div className="dot" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      </div>
      
      {/* Back - 6 dots */}
      <div className="dice-face" style={{ transform: 'rotateY(180deg) translateZ(60px)' }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div 
            key={i} 
            className="dot" 
            style={{ 
              position: 'absolute',
              top: i < 3 ? '25%' : '75%',
              left: i % 3 === 0 ? '25%' : i % 3 === 1 ? '50%' : '75%',
              transform: 'translate(-50%, -50%)'
            }} 
          />
        ))}
      </div>
      
      {/* Right - 2 dots */}
      <div className="dice-face" style={{ transform: 'rotateY(90deg) translateZ(60px)' }}>
        <div className="dot" style={{ position: 'absolute', top: '25%', left: '25%', transform: 'translate(-50%, -50%)' }} />
        <div className="dot" style={{ position: 'absolute', top: '75%', left: '75%', transform: 'translate(-50%, -50%)' }} />
      </div>
      
      {/* Left - 5 dots */}
      <div className="dice-face" style={{ transform: 'rotateY(-90deg) translateZ(60px)' }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div 
            key={i} 
            className="dot" 
            style={{ 
              position: 'absolute',
              top: i === 0 || i === 1 ? '25%' : i === 2 ? '50%' : '75%',
              left: i === 0 || i === 3 ? '25%' : i === 2 ? '50%' : '75%',
              transform: 'translate(-50%, -50%)'
            }} 
          />
        ))}
      </div>
      
      {/* Top - 3 dots */}
      <div className="dice-face" style={{ transform: 'rotateX(90deg) translateZ(60px)' }}>
        <div className="dot" style={{ position: 'absolute', top: '25%', left: '25%', transform: 'translate(-50%, -50%)' }} />
        <div className="dot" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        <div className="dot" style={{ position: 'absolute', top: '25%', left: '75%', transform: 'translate(-50%, -50%)' }} />
      </div>
      
      {/* Bottom - 4 dots */}
      <div className="dice-face" style={{ transform: 'rotateX(-90deg) translateZ(60px)' }}>
        {[0, 1, 2, 3].map(i => (
          <div 
            key={i} 
            className="dot" 
            style={{ 
              position: 'absolute',
              top: i < 2 ? '25%' : '75%',
              left: i % 2 === 0 ? '25%' : '75%',
              transform: 'translate(-50%, -50%)'
            }} 
          />
        ))}
      </div>

      <style jsx>{`
        .dice-face {
          position: absolute;
          width: 120px;
          height: 120px;
          background: linear-gradient(135deg, #ffffff 0%, #e8e8e8 50%, #d0d0d0 100%);
          border: 3px solid rgba(0, 0, 0, 0.2);
          border-radius: 15px;
          box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.5),
                      inset 0 0 10px rgba(0, 0, 0, 0.1),
                      0 0 30px rgba(0, 0, 0, 0.5);
        }
        
        .dot {
          width: 18px;
          height: 18px;
          background: radial-gradient(circle at 30% 30%, #2a2a2a, #000000);
          border-radius: 50%;
          box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.8);
        }
      `}</style>
    </div>
  )
}
