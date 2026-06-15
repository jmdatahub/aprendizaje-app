import { NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { safeEqual } from '@/lib/validate'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // Auth: this is a privileged operation (changes bot webhook). Require ADMIN_TOKEN.
    const adminToken = process.env.ADMIN_TOKEN
    if (!adminToken) {
      console.error('[telegram/setup] ADMIN_TOKEN not configured — refusing request')
      return NextResponse.json({ success: false, error: 'Server not configured for this operation' }, { status: 503 })
    }
    const provided = request.headers.get('x-admin-token') || ''
    if (!safeEqual(provided, adminToken)) {
      // Burn time so failed attempts can't be enumerated quickly
      const ip = getClientIp(request)
      const { success: allowed } = await rateLimit(`telegram-setup-fail:${ip}`, 5, 300)
      if (!allowed) {
        return NextResponse.json({ success: false, error: 'Too many attempts' }, { status: 429 })
      }
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { url } = body

    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
    }

    if (!url || typeof url !== 'string' || url.length > 500) {
      return NextResponse.json({ success: false, error: 'Missing or invalid URL' }, { status: 400 })
    }

    // Validate URL format and protocol - must be HTTPS and not localhost
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 })
    }

    if (parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ success: false, error: 'URL must use HTTPS' }, { status: 400 })
    }

    // Allowlist: webhook host must match TELEGRAM_WEBHOOK_HOST env var (e.g. "myapp.vercel.app").
    // Without this an attacker who reaches this endpoint could redirect the bot to their server.
    const allowedHost = process.env.TELEGRAM_WEBHOOK_HOST
    if (allowedHost && parsedUrl.hostname.toLowerCase() !== allowedHost.toLowerCase()) {
      return NextResponse.json({
        success: false,
        error: `URL must use the configured host (${allowedHost})`
      }, { status: 400 })
    }

    // SSRF defense: block private/loopback/link-local addresses. Telegram needs a
    // public host anyway, so anything else is an exfiltration attempt.
    const hostname = parsedUrl.hostname.toLowerCase()
    const blockedExact = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '::', 'metadata.google.internal'])
    const isPrivateIPv4 = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.|127\.|0\.)/.test(hostname)
    const isPrivateIPv6 = /^(fc|fd|fe80:|::1$|::$)/i.test(hostname)
    const isInternal = blockedExact.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')
    if (isPrivateIPv4 || isPrivateIPv6 || isInternal) {
      return NextResponse.json({
        success: false,
        error: 'URL no permitida (host privado/interno). Usa un dominio público.'
      }, { status: 400 })
    }

    // Path must END with /api/notify/telegram/webhook (not just contain it — e.g. attacker.com/?next=/api/notify/telegram/webhook).
    if (!parsedUrl.pathname.endsWith('/api/notify/telegram/webhook')) {
      return NextResponse.json({ success: false, error: 'URL must point to the webhook endpoint' }, { status: 400 })
    }

    // Reject userinfo (https://attacker@victim.com/...) and unusual ports
    if (parsedUrl.username || parsedUrl.password) {
      return NextResponse.json({ success: false, error: 'Credentials in URL are not allowed' }, { status: 400 })
    }
    if (parsedUrl.port && parsedUrl.port !== '443') {
      return NextResponse.json({ success: false, error: 'Only port 443 is allowed' }, { status: 400 })
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: parsedUrl.toString() })
    })
    const data = await res.json()

    if (!data.ok) {
      return NextResponse.json({ success: false, error: 'Telegram rejected the webhook URL' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })

  } catch (e) {
    console.error('[telegram/setup] Error:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ success: false, error: 'An internal error occurred' }, { status: 500 })
  }
}
