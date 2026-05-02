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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: habitId } = await params
    if (!isValidUUID(habitId)) return badRequest('id inválido')
    const supabase = getSupabase()
    const body = await request.json().catch(() => ({}))
    const { date } = body

    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST', message: 'Formato de fecha inválido (YYYY-MM-DD)' }, { status: 400 })
    }

    // Validate that date is reasonable (not too far in the future or past)
    const dateObj = new Date(date)
    const now = new Date()
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    if (dateObj < oneYearAgo || dateObj >= tomorrow) {
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST', message: 'Fecha fuera de rango' }, { status: 400 })
    }

    const { data: existingLog, error: fetchError } = await supabase
      .from('habit_logs')
      .select('id')
      .eq('habit_id', habitId)
      .eq('completed_at', date)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    let action = ''
    if (existingLog) {
      await supabase.from('habit_logs').delete().eq('id', existingLog.id)
      action = 'unchecked'
    } else {
      await supabase.from('habit_logs').insert({ habit_id: habitId, completed_at: date })
      action = 'checked'
    }

    return NextResponse.json({ success: true, action })
  } catch (e: any) {
    console.error('[habits/[id]/log] Error:', e?.message)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
