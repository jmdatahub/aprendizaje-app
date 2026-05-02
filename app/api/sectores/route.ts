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
    console.error('[sectores GET] Error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Error al obtener sectores' }, { status: 500 })
  }
}
