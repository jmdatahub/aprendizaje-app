import { NextResponse } from 'next/server'
import { SECTORES_DATA } from '@/shared/constants/sectores'

export const dynamic = 'force-dynamic'

const NOMBRES: Record<string, string> = {
  health: 'Salud y Rendimiento',
  nature: 'Ciencias Naturales',
  physics: 'Ciencias Físicas',
  math: 'Matemáticas y Lógica',
  tech: 'Tecnología y Computación',
  history: 'Historia y Filosofía',
  arts: 'Artes y Cultura',
  economy: 'Economía y Negocios',
  society: 'Sociedad y Psicología',
}

export async function GET() {
  try {
    const payload = SECTORES_DATA.map(s => ({
      id: s.id,
      nombre: NOMBRES[s.key] ?? s.key,
      icono: s.icono,
      color: s.color,
    }))
    return NextResponse.json(payload)
  } catch (error) {
    console.error('[API /sectores] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
