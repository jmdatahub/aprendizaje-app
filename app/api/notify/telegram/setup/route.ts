import { NextResponse } from 'next/server'

// Dynamic because it uses fetch
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()
    const token = process.env.TELEGRAM_BOT_TOKEN

    if (!token) {
        return NextResponse.json({ success: false, error: "Missing TELEGRAM_BOT_TOKEN" }, { status: 500 })
    }

    if (!url) {
        return NextResponse.json({ success: false, error: "Missing URL" }, { status: 400 })
    }

    console.log("Setting webhook to:", url)

    if (url.includes('localhost')) {
        return NextResponse.json({ 
            success: false, 
            error: "Telegram no puede enviar mensajes a 'localhost'. Necesitas una URL pública (ej. Vercel o ngrok) para que el bot responda." 
        })
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${url}`)
    const data = await res.json()

    if (!data.ok) {
        return NextResponse.json({ success: false, error: data.description })
    }

    return NextResponse.json({ success: true, data })

  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
