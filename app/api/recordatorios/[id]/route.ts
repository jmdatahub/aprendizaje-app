import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const { error } = await supabase
      .from('recordatorios')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[API /api/recordatorios/[id]] Delete error:', error)
      return NextResponse.json({
        success: false,
        error: 'DB_ERROR',
        message: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true
    })
  } catch (e: any) {
    console.error('[API /api/recordatorios/[id]] Error:', e)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: e?.message || 'Error al eliminar recordatorio'
    }, { status: 500 })
  }
}
