import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

// GET /api/chats
// Devuelve todos los chats ordenados por fecha desc
export async function GET() {
  const { data, error } = await supabase
    .from('chats')
    .select('id,titulo,created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ chats: data || [] })
}

// POST /api/chats
// Crea un chat de borrador con { titulo, conversacion }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { titulo, conversacion } = body || {}

    if (!titulo || typeof titulo !== 'string') {
      return NextResponse.json({ error: 'titulo requerido' }, { status: 400 })
    }
    if (!Array.isArray(conversacion)) {
      return NextResponse.json({ error: 'conversacion debe ser un array' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('chats')
      .insert({
        titulo,
        conversacion_json: conversacion,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: data?.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 })
  }
}

