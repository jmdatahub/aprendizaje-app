import { Sector } from '@/shared/types'

export type { Sector }

export interface SectorProgress {
  sector_id: string
  unlocked: boolean
}

export interface SectorWithProgress extends Sector {
  unlocked: boolean
}
