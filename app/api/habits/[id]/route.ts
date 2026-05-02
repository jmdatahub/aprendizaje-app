import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUUID, badRequest } from '@/lib/validate'

export const runtime = 'nodejs'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return badRequest('id inválido')
    const supabase = getSupabase()
    const body = await request.json().catch(() => ({}))

    const { text, category, with_notification, notification_times, custom_message } = body

    // Validate fields
    if (text !== undefined && (typeof text !== 'string' || text.trim().length === 0 || text.trim().length > 500)) {
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST', message: 'text inválido (máx. 500)' }, { status: 400 })
    }
    if (custom_message !== undefined && custom_message !== null && (typeof custom_message !== 'string' || custom_message.length > 500)) {
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST', message: 'custom_message demasiado largo' }, { status: 400 })
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (text !== undefined) updates.text = text.trim()
    if (category !== undefined) updates.category = category
    if (with_notification !== undefined) updates.with_notification = Boolean(with_notification)
    if (notification_times !== undefined) updates.notification_times = Array.isArray(notification_times) ? notification_times : []
    if (custom_message !== undefined) updates.custom_message = custom_message || null

    const { data, error } = await supabase
      .from('habits')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    console.error('[habits/[id] PATCH] Error:', e?.message)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return badRequest('id inválido')
    const supabase = getSupabase()

    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[habits/[id] DELETE] Error:', e?.message)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
