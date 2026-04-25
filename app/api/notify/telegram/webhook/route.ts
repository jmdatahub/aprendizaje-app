import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramMessage } from '@/lib/telegram-server'
import { isValidTelegramChatId, escapeLikeWildcards, sanitizeString, LIMITS } from '@/lib/validate'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      is_bot: boolean
      first_name: string
      username?: string
    }
    chat: {
      id: number
      first_name: string
      type: string
    }
    date: number
    text?: string
  }
  callback_query?: {
    id: string
    from: { id: number }
    message?: {
       chat: { id: number }
       message_id: number
    }
    data: string
  }
}

export async function POST(request: Request) {
  try {
    // 1. Validate Telegram webhook secret token
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (webhookSecret) {
      const incomingSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
      if (incomingSecret !== webhookSecret) {
        return NextResponse.json({ ok: false }, { status: 401 })
      }
    }

    // 2. Rate limiting per IP
    const ip = getClientIp(request)
    const { success: allowed } = rateLimit(`telegram-webhook:${ip}`, 60, 60)
    if (!allowed) {
      return NextResponse.json({ ok: false }, { status: 429 })
    }

    const update: TelegramUpdate = await request.json()
    const token = process.env.TELEGRAM_BOT_TOKEN

    if (!token) {
      console.error('[Telegram] Missing TELEGRAM_BOT_TOKEN')
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    // 3. Callback query handling (Buttons)
    if (update.callback_query) {
      const rawChatId = (update.callback_query.message?.chat.id || update.callback_query.from.id).toString()

      if (!isValidTelegramChatId(rawChatId)) {
        return NextResponse.json({ ok: false }, { status: 400 })
      }

      const chatId = rawChatId
      const callbackData = update.callback_query.data

      if (callbackData.startsWith('done:')) {
        const habitId = callbackData.split(':')[1]
        // Validate UUID format before DB query
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(habitId)) {
          return NextResponse.json({ ok: false }, { status: 400 })
        }
        await handleMarkDone(chatId, habitId, token)
      } else if (callbackData === 'summary') {
        await handleSummary(chatId, token)
      } else if (callbackData === 'list_pending') {
        await handleDoneMenu(chatId, '', token)
      }

      // Always answer callback to stop loading state in Telegram
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: update.callback_query.id })
      })

      return NextResponse.json({ ok: true })
    }

    // 4. Message handling
    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true })
    }

    const rawChatId = update.message.chat.id.toString()
    if (!isValidTelegramChatId(rawChatId)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const chatId = rawChatId
    const rawText = update.message.text.trim()

    // Validate text length
    if (rawText.length > LIMITS.texto) {
      return NextResponse.json({ ok: true })
    }

    const text = rawText.toLowerCase()

    // Command routing
    if (text === '/start') {
      const msg = "👋 ¡Hola! Soy tu asistente de hábitos.\n\n" +
        "Usa los botones o comandos para gestionar tu día:\n" +
        "• /summary - Ver qué falta hoy\n" +
        "• /done - Marcar un hábito rápidamente"

      await sendTelegramMessage(chatId, msg, token, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📊 Ver Resumen", callback_data: "summary" }, { text: "✅ Completar Uno", callback_data: "list_pending" }]
          ]
        }
      })
    }
    else if (text.includes('/summary') || text.includes('/resumen') || text === 'summary') {
      await handleSummary(chatId, token)
    }
    else if (text.startsWith('/done') || text === 'list_pending') {
      await handleDoneMenu(chatId, rawText, token)
    }

    return NextResponse.json({ ok: true })

  } catch (e: any) {
    console.error('[Telegram Webhook Error]:', e?.message || 'unknown')
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function handleSummary(chatId: string, token: string) {
  const supabase = getSupabase()
  const todayStr = new Date().toISOString().split('T')[0]

  const { data: habits } = await supabase
    .from('habits')
    .select('id, text, streak, habit_logs(completed_at)')
    .eq('telegram_chat_id', chatId)

  if (!habits || habits.length === 0) {
    await sendTelegramMessage(chatId, "No encontré hábitos vinculados a este chat. 🤷‍♂️\nConfigura tu Chat ID en la web.", token)
    return
  }

  const pending = habits.filter(h => !h.habit_logs?.some((l: any) => l.completed_at === todayStr))
  const completed = habits.filter(h => h.habit_logs?.some((l: any) => l.completed_at === todayStr))

  let msg = `📅 *Estado de hoy*\n\n`

  if (pending.length > 0) {
    msg += `*Pendientes (${pending.length}):*\n`
    pending.forEach(h => msg += `• ${h.text}\n`)
  } else {
    msg += `¡Enhorabuena! Has completado todo por hoy. 🎉\n`
  }

  if (completed.length > 0) {
    msg += `\n*Completados (${completed.length}):*\n`
    completed.forEach(h => msg += `✅ ${h.text} (🔥 ${h.streak})\n`)
  }

  const buttons = pending.map(h => ([{ text: `✅ ${h.text}`, callback_data: `done:${h.id}` }]))

  await sendTelegramMessage(chatId, msg, token, {
    reply_markup: { inline_keyboard: buttons }
  })
}

async function handleDoneMenu(chatId: string, text: string, token: string) {
  const supabase = getSupabase()
  const todayStr = new Date().toISOString().split('T')[0]

  // Extract and sanitize args
  const rawArgs = text.startsWith('/') ? text.split(' ').slice(1).join(' ') : ""
  const args = sanitizeString(rawArgs, LIMITS.searchQuery)

  if (args) {
    const safeArgs = escapeLikeWildcards(args)
    const { data: habits } = await supabase
      .from('habits')
      .select('id, text')
      .eq('telegram_chat_id', chatId)
      .ilike('text', `%${safeArgs}%`)
      .limit(5)

    if (habits && habits.length === 1) {
      await handleMarkDone(chatId, habits[0].id, token)
      return
    }
  }

  const { data: habits } = await supabase
    .from('habits')
    .select('id, text, habit_logs(completed_at)')
    .eq('telegram_chat_id', chatId)
    .limit(50)

  const pending = habits?.filter(h => !h.habit_logs?.some((l: any) => l.completed_at === todayStr)) || []

  if (pending.length === 0) {
    await sendTelegramMessage(chatId, "¡No tienes tareas pendientes! 🌟", token)
    return
  }

  const msg = "¿Cuál has completado?"
  const buttons = pending.map(h => ([{ text: h.text, callback_data: `done:${h.id}` }]))

  await sendTelegramMessage(chatId, msg, token, {
    reply_markup: { inline_keyboard: buttons }
  })
}

async function handleMarkDone(chatId: string, habitId: string, token: string) {
  const supabase = getSupabase()
  const todayStr = new Date().toISOString().split('T')[0]

  // Ownership check: verify the habit belongs to this chatId before marking
  const { data: habit } = await supabase
    .from('habits')
    .select('text, streak')
    .eq('id', habitId)
    .eq('telegram_chat_id', chatId)
    .single()

  if (!habit) return

  const { error } = await supabase
    .from('habit_logs')
    .insert({ habit_id: habitId, completed_at: todayStr })

  if (error) {
    if (error.code === '23505') {
      await sendTelegramMessage(chatId, `"${habit.text}" ya estaba completado. ✅`, token)
    } else {
      await sendTelegramMessage(chatId, `❌ Error al registrar el hábito.`, token)
    }
  } else {
    await sendTelegramMessage(chatId, `🚀 *¡Excelente!* Has completado: *${habit.text}*\nTu racha actual es de 🔥 *${habit.streak + 1}* días.`, token)
  }
}
