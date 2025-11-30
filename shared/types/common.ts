/**
 * Common types used across the application
 */

export interface Sector {
  id: string
  nombre: string
  icono?: string
  color?: string
}

export interface Aprendizaje {
  id: number
  titulo: string
  resumen: string
  sector_id: string | null
  conversacion_json?: any[]
  created_at: string
}

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}
