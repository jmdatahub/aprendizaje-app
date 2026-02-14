
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

// GET: List all habits (optionally filter by chat_id)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chat_id')
    const supabase = getSupabase()

    let query = supabase
      .from('habits')
      .select(`
        *,
        habit_logs (
          completed_at
        )
      `)
      .order('created_at', { ascending: true })

    if (chatId) {
      query = query.eq('telegram_chat_id', chatId)
    }

    const { data, error } = await query

    if (error) throw error

    // Transform data to match frontend structure slightly if needed
    // But ideally we keep it close.
    // The frontend expects `history` as array of strings. 
    // `habit_logs` comes as array of objects { completed_at: '...' }
    const habits = (data || []).map((h: any) => ({
      ...h,
      history: h.habit_logs?.map((l: any) => l.completed_at) || []
    }))

    return NextResponse.json({ success: true, data: habits })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST: Create a new habit
export async function POST(request: Request) {
  try {
    const supabase = getSupabase()
    const body = await request.json()
    
    // Body should match table structure roughly, or we map it
    const { text, category, streak, with_notification, notification_times, custom_message, telegram_chat_id, created_at } = body

    const { data, error } = await supabase
      .from('habits')
      .insert({
        text,
        category: category || 'other',
        streak: streak || 0,
        with_notification: with_notification ?? true,
        notification_times: notification_times || [],
        custom_message,
        telegram_chat_id,
        created_at: created_at || new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// PUT: Batch Sync (Migrate from LocalStorage)
export async function PUT(request: Request) {
  try {
    const supabase = getSupabase()
    const body = await request.json()
    const { habits } = body // Expects array of habits from local storage

    if (!Array.isArray(habits)) {
        throw new Error("Invalid body, expected { habits: [] }")
    }

    const results = []

    for (const h of habits) {
        // 1. Create Habit
        const { data: habitData, error: habitError } = await supabase
            .from('habits')
            .insert({
                text: h.text,
                category: h.category,
                streak: h.streak,
                with_notification: h.withNotification,
                notification_times: h.notificationTimes,
                custom_message: h.customMessage,
                telegram_chat_id: h.telegramConfig?.chatId, // Try to grab from nested if exists, or passed separately
                created_at: h.createdAt
            })
            .select()
            .single()
        
        if (habitError) {
            console.error("Error migrating habit", h.text, habitError)
            continue
        }

        // 2. Create Logs (History)
        if (h.history && h.history.length > 0) {
            const logs = h.history.map((date: string) => ({
                habit_id: habitData.id,
                completed_at: date
            }))
            
            const { error: logsError } = await supabase
                .from('habit_logs')
                .insert(logs)
            
            if (logsError) {
                console.error("Error migrating logs for", h.text, logsError)
            }
        }
        results.push(habitData)
    }

    return NextResponse.json({ success: true, migrated: results.length })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
