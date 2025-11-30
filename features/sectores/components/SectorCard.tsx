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

  return (
    <div
      className={`${getColorClass(sector.color)} rounded-lg p-6 text-center transition-shadow relative ${
        sector.unlocked
          ? 'hover:shadow-lg cursor-pointer transition-transform duration-200 hover:-translate-y-0.5'
          : 'cursor-not-allowed'
      } animate-fade-in-up`}
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={handleClick}
    >
      {hasAlert && hasAlert > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md animate-bounce z-10 border-2 border-white text-xs">
          {hasAlert}
        </div>
      )}

      <div className={sector.unlocked ? '' : 'pointer-events-none'}>
        <div className={`text-4xl mb-2 ${sector.unlocked ? '' : 'grayscale blur-[1px]'}`}>
          {sector.icono}
        </div>
        <h3 className={`font-semibold text-gray-700 ${sector.unlocked ? '' : 'grayscale blur-[1px]'}`}>
          {sector.nombre}
        </h3>
      </div>

      {!sector.unlocked && (
        <div className="absolute inset-0 rounded-lg flex items-center justify-center pointer-events-auto">
          <button
            className="rounded-md bg-white/70 px-4 py-2 text-gray-900 shadow hover:bg-white"
            onClick={handleUnlockClick}
          >
            Desbloquear esta sección
          </button>
        </div>
      )}
    </div>
  )
}
