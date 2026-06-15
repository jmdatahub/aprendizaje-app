import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isValidUUID, badRequest } from '@/lib/validate'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return badRequest('id inválido')

    const { error } = await supabase
      .from('recordatorios')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[recordatorios/[id] DELETE] DB error:', error?.message)
      return NextResponse.json({ success: false, error: 'DB_ERROR', message: 'Error al eliminar recordatorio' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[recordatorios/[id] DELETE] Error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR', message: 'Error al eliminar recordatorio' }, { status: 500 })
  }
}
