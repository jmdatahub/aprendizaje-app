import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Hardcoded sectores data - temporary solution while we fix Supabase
const SECTORES_DATA = [
  { id: 1, nombre: 'Salud y Rendimiento', icono: '🍎', color: 'green' },
  { id: 2, nombre: 'Ciencias Naturales', icono: '🔬', color: 'blue' },
  { id: 3, nombre: 'Ciencias Fisicas', icono: '🛸', color: 'purple' },
  { id: 4, nombre: 'Matematicas y Logica', icono: '🔢', color: 'yellow' },
  { id: 5, nombre: 'Tecnologia y Computacion', icono: '💻', color: 'blue' },
  { id: 6, nombre: 'Historia y Filosofia', icono: '📜', color: 'orange' },
  { id: 7, nombre: 'Artes y Cultura', icono: '🎨', color: 'pink' },
  { id: 8, nombre: 'Economia y Negocios', icono: '💰', color: 'green' },
  { id: 9, nombre: 'Sociedad y Psicologia', icono: '🧠', color: 'purple' },
]

export async function GET() {
  try {
    console.log('[API /sectores] Returning hardcoded sectores data')
    return NextResponse.json(SECTORES_DATA)
  } catch (error) {
    console.error('[API /sectores] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
