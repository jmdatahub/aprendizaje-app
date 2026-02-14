
export async function sendTelegramMessage(chatId: string, text: string, token: string, options: any = {}) {
  if (!chatId || !token) {
    console.error("Missing chatId or token for Telegram message")
    return { success: false, error: "Missing config" }
  }

  try {
    const body = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      ...options
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await res.json()
    
    if (!data.ok) {
      console.error("Telegram API Error:", data)
      return { success: false, error: data.description }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error("Telegram Network Error:", error)
    return { success: false, error: error.message }
  }
}
