import { createClient } from '@supabase/supabase-js'

// Simple Email Service Stub
// En producción integrar con Resend, SendGrid, etc.

export class EmailService {
  static async sendReminderEmail(to: string, skillName: string, time: string) {
    console.log(`[EmailService] 📧 Sending reminder to ${to}`)
    console.log(`[EmailService] Subject: ¡Hora de practicar ${skillName}!`)
    console.log(`[EmailService] Body: Hola! Es hora de tu sesión de práctica de ${skillName} a las ${time}. ¡Ánimo!`)
    
    // Aquí iría la llamada real
    // await resend.emails.send(...)
    
    return true
  }
}
