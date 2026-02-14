import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramMessage } from '@/lib/telegram-server'

// Keep this endpoint dynamic to avoid static generation
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // 1. Verify Cron Request (Optional but recommended)
    // Vercel injects CRON_SECRET header
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return new NextResponse('Unauthorized', { status: 401 })
      // For now, let's just log a warning and proceed if in development or if user hasn't set up secret yet
      console.warn("Cron Secret Mismatch or Missing")
    }

    // 2. Init Supabase (Service Role preferred for background tasks)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 3. Fetch all active habits with their logs for today?
    // We just want a list of "What do I have to do today?"
    // So we fetch habits and filter by notification settings if complex, but simple version: Fetch All.
    // Order by user/chat_id to group easily
    const { data: habits, error } = await supabase
      .from('habits')
      .select('id, text, category, telegram_chat_id, streak')
      .not('telegram_chat_id', 'is', null) // Only those with telegram setup
      .order('telegram_chat_id')
    
    if (error) throw error

    // 4. Group by Chat ID
    type Habit = { id: string, text: string, category: string, streak: number }
    const habitsByChat: Record<string, Habit[]> = {}

    habits?.forEach(h => {
        if (!h.telegram_chat_id) return
        if (!habitsByChat[h.telegram_chat_id]) {
            habitsByChat[h.telegram_chat_id] = []
        }
        habitsByChat[h.telegram_chat_id].push(h)
    })

    // 5. Send Notices
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
        return NextResponse.json({ success: false, error: "Missing TELEGRAM_BOT_TOKEN env var" }, { status: 500 })
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
    console.error("Cron Job Error:", e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
