'use client'

import { LoadingSpinner, ErrorMessage } from '@/shared/components'
import { useSectores } from '../hooks'
import { SectorCard } from './SectorCard'
import { SectorWithProgress } from '../types'

interface SectoresGridProps {
  onUnlock: (sector: SectorWithProgress) => void
  alerts?: Record<string, number> // Maps sector name to count of pending reviews
}

export function SectoresGrid({ onUnlock, alerts = {} }: SectoresGridProps) {
  const { sectores, loading, error, refresh } = useSectores()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorMessage
        title="Error al cargar sectores"
        message={error}
        onRetry={refresh}
      />
    )
  }

  if (sectores.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No hay sectores disponibles
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {sectores.map((sector, index) => (
        <SectorCard
          key={sector.id}
          sector={sector}
          index={index}
          onUnlock={onUnlock}
          hasAlert={alerts[sector.nombre.toLowerCase()]}
        />
      ))}
    </div>
  )
}
