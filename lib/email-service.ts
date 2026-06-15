// Email Service: integrates with Resend if RESEND_API_KEY is set, otherwise logs.
// To enable real sending, set in .env.local:
//   RESEND_API_KEY=re_...
//   RESEND_FROM=tu-app@tu-dominio.com   (must be a verified Resend sender)

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

// Validates a single email address. Rejects newlines/control chars (header injection)
// and enforces basic shape. We don't try to be RFC-perfect.
const EMAIL_RE = /^[^\s@<>"'\\]+@[^\s@<>"'\\]+\.[^\s@<>"'\\]+$/
function isValidEmail(s: string): boolean {
  return typeof s === 'string' && s.length <= 254 && EMAIL_RE.test(s) && !/[\r\n\t\x00]/.test(s)
}

export class EmailService {
  static async sendReminderEmail(to: string, skillName: string, time: string): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.RESEND_FROM

    if (!isValidEmail(to)) {
      console.error('[EmailService] invalid recipient address')
      return false
    }
    if (from && !isValidEmail(from)) {
      console.error('[EmailService] invalid RESEND_FROM address')
      return false
    }

    // Bound and strip control chars from user-controlled fields
    const safeSkill = String(skillName || '').replace(/[\r\n\t\x00-\x1f]/g, ' ').slice(0, 200)
    const safeTime = String(time || '').replace(/[\r\n\t\x00-\x1f]/g, ' ').slice(0, 50)

    const subject = `¡Hora de practicar ${safeSkill}!`
    const text = `Hola, es hora de tu sesión de práctica de ${safeSkill} programada para las ${safeTime}. ¡Ánimo!`
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px;">
        <h2 style="color:#4f46e5;margin:0 0 12px;">⏰ ¡Hora de practicar ${escapeHtml(safeSkill)}!</h2>
        <p style="color:#374151;font-size:15px;line-height:1.6;">${escapeHtml(text)}</p>
      </div>
    `.trim()

    if (!apiKey || !from) {
      console.log(`[EmailService] (stub) → ${to}: ${subject}`)
      return false
    }

    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to, subject, text, html }),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error(`[EmailService] Resend error ${res.status}: ${body.slice(0, 200)}`)
        return false
      }
      return true
    } catch (err) {
      console.error(`[EmailService] Network error: ${err instanceof Error ? err.message : String(err)}`)
      return false
    }
  }
}
