import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { EmailService } from '@/lib/email-service'
import { verifyBearer } from '@/lib/validate'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Enforce cron secret — required in all environments (timing-safe comparison)
  const authHeader = request.headers.get('authorization')
  if (!verifyBearer(authHeader, process.env.CRON_SECRET)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const now = new Date()
    const diaSemana = now.getDay()
    const hora = now.getHours()
    const hourPrefix = `${hora.toString().padStart(2, '0')}:`

    console.log(`[Cron] Checking reminders for Day ${diaSemana} at hour ${hourPrefix}xx`)

    const { data: recordatorios, error } = await supabase
      .from('recordatorios')
      .select(`
        id,
        hora,
        habilidad_id,
        email_enabled,
        habilidades ( nombre )
      `)
      .eq('dia_semana', diaSemana)
      .eq('active', true)
      .limit(5000)

    if (error) throw error

    // Vercel Hobby cron runs hourly: trigger every reminder scheduled within the current hour.
    const toSend = recordatorios?.filter(r =>
      r.hora && r.hora.startsWith(hourPrefix) && r.email_enabled
    ) || []

    console.log(`[Cron] Found ${toSend.length} reminders to send`)

    const recipientEmail = process.env.REMINDER_EMAIL_TO || ''
    const configError = toSend.length > 0 && !recipientEmail

    if (configError) {
      console.error(
        `[Cron] REMINDER_EMAIL_TO no configurada; ${toSend.length} recordatorios no enviados`
      )
    }

    const results = []
    let sentCount = 0
    let skippedCount = 0
    type Recordatorio = {
      id: string;
      hora: string;
      habilidades?: { nombre?: string } | { nombre?: string }[];
    }
    for (const r of toSend as Recordatorio[]) {
      const hab = r?.habilidades
      const habilidadNombre = (Array.isArray(hab) ? hab[0]?.nombre : hab?.nombre) || 'Habilidad'

      if (!recipientEmail) {
        results.push({ id: r.id, sent: false, skipped: true })
        skippedCount++
        continue
      }

      const sent = await EmailService.sendReminderEmail(recipientEmail, habilidadNombre, r.hora)
      results.push({ id: r.id, sent })
      if (sent) {
        sentCount++
      } else {
        skippedCount++
      }
    }

    return NextResponse.json({
      success: !configError,
      configError,
      checkedAt: new Date().toISOString(),
      sentCount,
      skippedCount,
      results
    })
  } catch (e) {
    console.error('[Cron check-reminders] Error:', e instanceof Error ? e.message : 'unknown')
    return NextResponse.json({ success: false, error: 'CRON_ERROR' }, { status: 500 })
  }
}
