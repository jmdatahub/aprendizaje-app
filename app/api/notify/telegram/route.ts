import { NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { isValidTelegramChatId } from '@/lib/validate'

export const runtime = 'nodejs'

// Telegram bot tokens have a fixed shape: "<bot_id>:<35-char base64-ish secret>"
const TELEGRAM_TOKEN_RE = /^\d{6,12}:[A-Za-z0-9_-]{30,50}$/

function isSameOrigin(request: Request): boolean {
  // Reject cross-origin POSTs to prevent CSRF / abuse from third-party sites
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  if (!origin && !referer) return false
  const host = request.headers.get('host')
  if (!host) return false
  if (origin) {
    try {
      const u = new URL(origin)
      return u.host === host
    } catch { return false }
  }
  try {
    const u = new URL(referer!)
    return u.host === host
  } catch { return false }
}

export async function POST(request: Request) {
  try {
    // Same-origin enforcement — this endpoint is only meant for our own UI.
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Rate limit: 10 req/min per IP
    const ip = getClientIp(request)
    const { success: allowed } = await rateLimit(`notify-telegram:${ip}`, 10, 60)
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const { token, chatId, text } = body

    // Strict format validation prevents using this as an arbitrary Telegram relay.
    if (typeof token !== 'string' || !TELEGRAM_TOKEN_RE.test(token)) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
    }
    if (!isValidTelegramChatId(chatId)) {
      return NextResponse.json({ error: 'Invalid chatId' }, { status: 400 })
    }
    if (typeof text !== 'string' || text.length === 0 || text.length > 4096) {
      return NextResponse.json({ error: 'Invalid text (max 4096 chars)' }, { status: 400 })
    }
    // Strip control chars (no header smuggling, no clean-CRLF in markdown)
    const safeText = text.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '')

    const telegramUrl = `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: safeText,
        parse_mode: 'Markdown',
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      // Don't leak Telegram's internal description
      return NextResponse.json({ error: 'Telegram rejected the request' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[notify/telegram] Error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
