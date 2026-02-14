
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

// POST: Toggle habit log (check/uncheck) for a specific date
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: habitId } = await params
    const supabase = getSupabase()
    const body = await request.json()
    const { date } = body // YYYY-MM-DD

    if (!date) return NextResponse.json({ success: false, error: 'Date required' }, { status: 400 })

    // 1. Check if log exists
    const { data: existingLog, error: fetchError } = await supabase
        .from('habit_logs')
        .select('id')
        .eq('habit_id', habitId)
        .eq('completed_at', date)
        .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = exists? no
        throw fetchError
    }

    let action = ''
    if (existingLog) {
        // DELETE (Uncheck)
        await supabase.from('habit_logs').delete().eq('id', existingLog.id)
        action = 'unchecked'
    } else {
        // INSERT (Check)
        await supabase.from('habit_logs').insert({
            habit_id: habitId,
            completed_at: date
        })
        action = 'checked'
    }
    
    return NextResponse.json({ success: true, action })

  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
