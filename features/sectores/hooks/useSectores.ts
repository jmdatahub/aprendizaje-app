'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { SectorWithProgress } from '../types'
import { fetchSectores, fetchUnlockedSectors, getLocalProgress, mergeProgress } from '../api'

interface UseSectoresReturn {
  sectores: SectorWithProgress[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook to manage sectores with progress tracking
 */
export function useSectores(): UseSectoresReturn {
  const [sectores, setSectores] = useState<SectorWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Ensure we only run on client
  useEffect(() => {
    setMounted(true)
  }, [])

  const loadSectores = async () => {
    // Only run on client
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch sectores
      const sectoresData = await fetchSectores().catch(err => {
        console.error('Error fetching sectores:', err)
        return [] // Return empty array on error
      })

      // Fetch progress
      let token: string | undefined
      try {
        const session = await (supabase as any)?.auth?.getSession?.()
        token = session?.data?.session?.access_token
      } catch {}

      let serverProgress: number[] = []
      try {
        serverProgress = await fetchUnlockedSectors(token)
      } catch (err) {
        console.error('Error fetching unlocked sectors:', err)
        // Don't fail completely if progress fetch fails
      }

      const localProgress = getLocalProgress()
      const unlockedIds = mergeProgress(serverProgress, localProgress)
      const unlockedSet = new Set(unlockedIds)

      // Combine data
      const sectoresWithProgress: SectorWithProgress[] = sectoresData.map((sector) => ({
        ...sector,
        unlocked: unlockedSet.has(sector.id),
      }))

      setSectores(sectoresWithProgress)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar sectores'
      setError(message)
      console.error('Error in useSectores:', err)
      // Set empty state on fatal error
      setSectores([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (mounted) {
      loadSectores()
    }
  }, [mounted])

  return {
    sectores,
    loading,
    error,
    refresh: loadSectores,
  }
}
