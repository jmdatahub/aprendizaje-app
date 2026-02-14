import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { EmailService } from '@/lib/email-service'

// Este endpoint debería ser llamado por un Cron Job (ej. cada minuto o cada hora)
export async function GET(request: Request) {
  try {
    const now = new Date()
    const diaSemana = now.getDay() // 0-6
    const hora = now.getHours()
    const minuto = now.getMinutes()
    
    // Formato HH:MM
    const timePrefix = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`
    
    console.log(`[Cron] Checking reminders for Day ${diaSemana} at ${timePrefix}`)
    
    // Traer todos los recordatorios del día activo
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
    
    if (error) throw error
    
    // Filtrar los que coinciden con la hora/minuto actual
    // La columna 'hora' es type TIME, suele venir como '18:00:00'
    const toSend = recordatorios?.filter(r => 
      r.hora && r.hora.startsWith(timePrefix) && r.email_enabled
    ) || []
    
    console.log(`[Cron] Found ${toSend.length} reminders to send`)

    const results = []
    for (const r of toSend) {
       // @ts-ignore
       const habilidadNombre = r.habilidades?.nombre || 'Habilidad'
       
       // En un caso real, obtendríamos el email del usuario dueño de la habilidad
       // Por ahora enviamos a un mail de prueba
       const sent = await EmailService.sendReminderEmail(
         'usuario@ejemplo.com', 
         habilidadNombre, 
         r.hora
       )
       results.push({ id: r.id, sent })
    }

    return NextResponse.json({ 
      success: true, 
      checkedAt: new Date().toISOString(),
      sentCount: results.length,
      results 
    })
  } catch (e: any) {
    console.error('[API /api/cron/check-reminders] Error:', e)
    return NextResponse.json({
      success: false,
      error: 'CRON_ERROR',
      message: e?.message
    }, { status: 500 })
  }
}
