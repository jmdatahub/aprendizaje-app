'use client'

import { useRouter } from 'next/navigation'
import { SectorWithProgress } from '../types'
import { playClick } from '@/shared/utils/sounds'

interface SectorCardProps {
  sector: SectorWithProgress
  index: number
  onUnlock: (sector: SectorWithProgress) => void
  hasAlert?: number // Count of pending reviews
}

const COLOR_CLASSES: Record<string, string> = {
  green: 'bg-green-100',
  blue: 'bg-blue-100',
  purple: 'bg-purple-100',
  yellow: 'bg-yellow-100',
  red: 'bg-red-100',
  orange: 'bg-orange-100',
  pink: 'bg-pink-100',
  teal: 'bg-teal-100',
  indigo: 'bg-indigo-100',
}

export function SectorCard({ sector, index, onUnlock, hasAlert }: SectorCardProps) {
  const router = useRouter()

  const getColorClass = (color?: string) => {
    return (color && COLOR_CLASSES[color]) || 'bg-gray-100'
  }

  const handleClick = () => {
    if (sector.unlocked) {
      playClick()
      router.push(`/aprendizajes/${sector.id}`)
    }
  }

  const handleUnlockClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    playClick()
    onUnlock(sector)
  }

  const showAlert = typeof hasAlert === 'number' && hasAlert > 0
  const isLocked = !sector.unlocked
  const cardLabel = isLocked
    ? `Desbloquear ${sector.nombre}`
    : `Abrir ${sector.nombre}`

  return (
    <button
      type="button"
      aria-label={cardLabel}
      className={`${getColorClass(sector.color)} rounded-2xl p-3 sm:p-5 text-center transition-all relative min-w-0 overflow-hidden flex flex-col items-center justify-center gap-1.5 sm:gap-2 min-h-[120px] sm:min-h-[140px] ${
        sector.unlocked
          ? 'hover:shadow-lg cursor-pointer hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
          : 'cursor-pointer active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
      } animate-fade-in-up`}
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={isLocked ? handleUnlockClick : handleClick}
    >
      {showAlert ? (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold shadow-md animate-bounce z-10 border-2 border-white text-xs">
          {hasAlert}
        </div>
      ) : null}

      {/* Lock icon for locked sectors */}
      {isLocked && (
        <div className="absolute top-2 right-2 text-gray-500/60 bg-white/40 rounded-full p-1" aria-hidden="true">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      )}

      <div className={`text-4xl sm:text-5xl ${isLocked ? 'opacity-80' : ''}`} aria-hidden="true">
        {sector.icono}
      </div>
      <h3 className={`font-semibold text-[13px] sm:text-base leading-tight break-words text-balance ${isLocked ? 'text-gray-700/90' : 'text-gray-800'}`}>
        {sector.nombre}
      </h3>
    </button>
  )
}
