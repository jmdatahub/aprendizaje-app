import { apiGet } from '@/shared/utils'
import { Sector } from './types'

/**
 * Fetch all sectores from the API
 */
export async function fetchSectores(): Promise<Sector[]> {
  return apiGet<Sector[]>('/api/sectores')
}

const SECTOR_MAPPING: Record<number, string> = {
  1: 'Salud y Rendimiento',
  2: 'Ciencias Naturales',
  3: 'Ciencias Fisicas',
  4: 'Matematicas y Logica',
  5: 'Tecnologia y Computacion',
  6: 'Historia y Filosofia',
  7: 'Artes y Cultura',
  8: 'Economia y Negocios',
  9: 'Sociedad y Psicologia',
}

/**
 * Get unlocked sector IDs from LocalStorage
 */
export async function fetchUnlockedSectors(token?: string): Promise<number[]> {
  if (typeof window === 'undefined') return []
  
  const unlockedIds: number[] = []
  
  Object.entries(SECTOR_MAPPING).forEach(([idStr, name]) => {
    const id = Number(idStr)
    const key = `sector_data_${name.toLowerCase()}`
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const data = JSON.parse(stored)
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          unlockedIds.push(id)
        }
      }
    } catch (e) {
      console.warn('Error checking sector unlock:', name, e)
    }
  })
  
  return unlockedIds
}

/**
 * Get local progress from localStorage
 */
export function getLocalProgress(): number[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem('progreso_local_ids')
    if (stored) {
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed : []
    }
  } catch (error) {
    console.warn('Error reading local progress:', error)
  }
  
  return []
}

/**
 * Merge server and local progress
 */
export function mergeProgress(serverIds: number[], localIds: number[]): number[] {
  return Array.from(new Set([...serverIds, ...localIds]))
}
