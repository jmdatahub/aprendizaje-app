import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET() {
  const { data, error } = await supabase
    .from('chats')
    .select('id,titulo,created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[chats GET] DB error:', error?.message)
    return NextResponse.json({ error: 'Error al obtener chats' }, { status: 500 })
  }

  return NextResponse.json({ chats: data || [] })
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { titulo, conversacion } = body || {}

    if (!titulo || typeof titulo !== 'string' || titulo.trim().length === 0 || titulo.trim().length > 255) {
      return NextResponse.json({ error: 'titulo requerido (máx. 255 caracteres)' }, { status: 400 })
    }
    if (!Array.isArray(conversacion) || conversacion.length > 200) {
      return NextResponse.json({ error: 'conversacion inválida' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('chats')
      .insert({
        titulo: titulo.trim(),
        conversacion_json: conversacion,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[chats POST] DB error:', error?.message)
      return NextResponse.json({ error: 'Error al crear chat' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: data?.id })
  } catch (e) {
    console.error('[chats POST] Error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 })
  }
}
