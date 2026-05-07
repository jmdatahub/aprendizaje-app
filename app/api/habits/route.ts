import { NextResponse } from 'next/server'
import { isValidTelegramChatId } from '@/lib/validate'
import { getSupabaseAnon } from '@/lib/supabaseAnonClient'

export const runtime = 'nodejs'


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chat_id')

    // Validate chatId if provided
    if (chatId && !isValidTelegramChatId(chatId)) {
      return NextResponse.json({ success: false, error: 'INVALID_PARAM' }, { status: 400 })
    }

    const supabase = getSupabaseAnon()

    let query = supabase
      .from('habits')
      .select('*, habit_logs(completed_at)')
      .order('created_at', { ascending: true })
      .limit(500)

    if (chatId) {
      query = query.eq('telegram_chat_id', chatId)
    }

    const { data, error } = await query
    if (error) throw error

    const habits = (data || []).map((h: any) => ({
      ...h,
      history: h.habit_logs?.map((l: any) => l.completed_at) || []
    }))

    return NextResponse.json({ success: true, data: habits })
  } catch (e: any) {
    console.error('[habits GET] Error:', e?.message)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAnon()
    const body = await request.json().catch(() => ({}))
    const { text, category, streak, with_notification, notification_times, custom_message, telegram_chat_id } = body

    if (!text || typeof text !== 'string' || text.trim().length === 0 || text.trim().length > 500) {
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST', message: 'text inválido (máx. 500 caracteres)' }, { status: 400 })
    }
    if (telegram_chat_id && !isValidTelegramChatId(String(telegram_chat_id))) {
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST', message: 'telegram_chat_id inválido' }, { status: 400 })
    }
    if (custom_message && (typeof custom_message !== 'string' || custom_message.length > 500)) {
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST', message: 'custom_message demasiado largo' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('habits')
      .insert({
        text: text.trim(),
        category: category || 'other',
        streak: typeof streak === 'number' && streak >= 0 ? streak : 0,
        with_notification: with_notification ?? true,
        notification_times: Array.isArray(notification_times) ? notification_times : [],
        custom_message: custom_message || null,
        telegram_chat_id: telegram_chat_id || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    console.error('[habits POST] Error:', e?.message)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = getSupabaseAnon()
    const body = await request.json().catch(() => ({}))
    const { habits } = body

    if (!Array.isArray(habits) || habits.length === 0 || habits.length > 500) {
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST', message: 'habits debe ser un array (máx. 500)' }, { status: 400 })
    }

    const results = []
    for (const h of habits) {
      if (!h.text || typeof h.text !== 'string') continue

      const { data: habitData, error: habitError } = await supabase
        .from('habits')
        .insert({
          text: h.text.slice(0, 500),
          category: h.category || 'other',
          streak: typeof h.streak === 'number' ? h.streak : 0,
          with_notification: h.withNotification ?? true,
          notification_times: Array.isArray(h.notificationTimes) ? h.notificationTimes : [],
          custom_message: h.customMessage ? String(h.customMessage).slice(0, 500) : null,
          telegram_chat_id: h.telegramConfig?.chatId ? String(h.telegramConfig.chatId).slice(0, 20) : null,
          created_at: h.createdAt || new Date().toISOString()
        })
        .select()
        .single()

      if (habitError) {
        console.error('[habits PUT] habit insert error:', habitError?.message)
        continue
      }

      if (Array.isArray(h.history) && h.history.length > 0) {
        const validDates = h.history
          .filter((d: any) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
          .slice(0, 1000)

        if (validDates.length > 0) {
          const logs = validDates.map((date: string) => ({ habit_id: habitData.id, completed_at: date }))
          const { error: logsError } = await supabase.from('habit_logs').insert(logs)
          if (logsError) console.error('[habits PUT] logs insert error:', logsError?.message)
        }
      }

      results.push(habitData)
    }

    return NextResponse.json({ success: true, migrated: results.length })
  } catch (e: any) {
    console.error('[habits PUT] Error:', e?.message)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
