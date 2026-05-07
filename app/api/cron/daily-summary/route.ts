import { NextResponse } from 'next/server'
import { sendTelegramMessage } from '@/lib/telegram-server'
import { verifyBearer } from '@/lib/validate'
import { getSupabaseAdmin } from '@/lib/supabaseAnonClient'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Enforce cron secret — required in all environments (timing-safe comparison)
  const authHeader = request.headers.get('authorization')
  if (!verifyBearer(authHeader, process.env.CRON_SECRET)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data: habits, error } = await supabase
      .from('habits')
      .select('id, text, category, telegram_chat_id, streak')
      .not('telegram_chat_id', 'is', null)
      .order('telegram_chat_id')
      .limit(5000)

    if (error) throw error

    type Habit = { id: string; text: string; category: string; streak: number }
    const habitsByChat: Record<string, Habit[]> = {}

    habits?.forEach(h => {
      if (!h.telegram_chat_id) return
      if (!habitsByChat[h.telegram_chat_id]) {
        habitsByChat[h.telegram_chat_id] = []
      }
      habitsByChat[h.telegram_chat_id].push(h)
    })

    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      return NextResponse.json({ success: false, error: 'Missing TELEGRAM_BOT_TOKEN' }, { status: 500 })
    }

    const results = []
    for (const [chatId, userHabits] of Object.entries(habitsByChat)) {
      if (userHabits.length === 0) continue

      const message = `
🌅 *¡Buenos días!* Aquí tienes tus objetivos para hoy:

${userHabits.map(h => `▫️ ${h.text} ${(h.streak > 0 ? `🔥${h.streak}` : '')}`).join('\n')}

¡A por ellos! 💪
      `.trim()

      const res = await sendTelegramMessage(chatId, message, token)
      results.push({ chatId, success: res?.success })
    }

    return NextResponse.json({ success: true, processed: results.length, details: results })

  } catch (e: any) {
    console.error('[Cron daily-summary] Error:', e?.message || 'unknown')
    return NextResponse.json({ success: false, error: 'CRON_ERROR' }, { status: 500 })
  }
}
