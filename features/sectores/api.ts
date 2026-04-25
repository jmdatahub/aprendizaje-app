import { apiGet } from '@/shared/utils'
import { Sector } from './types'

/**
 * Fetch all sectores from the API
 */
export async function fetchSectores(): Promise<Sector[]> {
  return apiGet<Sector[]>('/api/sectores')
}

/**
 * Get unlocked sector IDs from LocalStorage.
 * Returns the string ids defined in shared/constants/sectores so it lines up
 * with the API and the rest of the app.
 */
export async function fetchUnlockedSectors(token?: string): Promise<string[]> {
  if (typeof window === 'undefined') return []

  const { SECTORES_DATA } = await import('@/shared/constants/sectores')
  const unlockedIds: string[] = []

  SECTORES_DATA.forEach(sector => {
    const key = `sector_data_${sector.id}`
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const data = JSON.parse(stored)
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          unlockedIds.push(sector.id)
        }
      }
    } catch (e) {
      console.warn('Error checking sector unlock:', sector.id, e)
    }
  })

  return unlockedIds
}

/**
 * Get local progress from localStorage
 */
export function getLocalProgress(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem('progreso_local_ids')
    if (stored) {
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed.map(String) : []
    }
  } catch (error) {
    console.warn('Error reading local progress:', error)
  }

  return []
}

/**
 * Merge server and local progress
 */
export function mergeProgress(serverIds: string[], localIds: string[]): string[] {
  return Array.from(new Set([...serverIds, ...localIds]))
}
