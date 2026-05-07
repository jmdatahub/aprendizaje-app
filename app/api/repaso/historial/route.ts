import { NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@/lib/supabaseRoute'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseForRequest(request)

    const { data, error } = await supabase
      .from('exam_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      console.error('[repaso/historial GET] DB error:', error?.message)
      return NextResponse.json({ success: false, error: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    console.error('[repaso/historial GET] Error:', e?.message)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseForRequest(request)
    const body = await request.json().catch(() => ({}))

    const { score, total_questions, questions_data } = body

    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100000) {
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST', message: 'score inválido' }, { status: 400 })
    }
    if (typeof total_questions !== 'number' || !Number.isInteger(total_questions) || total_questions < 1 || total_questions > 1000) {
      return NextResponse.json({ success: false, error: 'INVALID_REQUEST', message: 'total_questions inválido' }, { status: 400 })
    }
    if (questions_data !== undefined && questions_data !== null) {
      if (typeof questions_data !== 'object') {
        return NextResponse.json({ success: false, error: 'INVALID_REQUEST', message: 'questions_data inválido' }, { status: 400 })
      }
      try {
        if (JSON.stringify(questions_data).length > 100_000) {
          return NextResponse.json({ success: false, error: 'INVALID_REQUEST', message: 'questions_data demasiado grande' }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ success: false, error: 'INVALID_REQUEST', message: 'questions_data no serializable' }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('exam_history')
      .insert({ score, total_questions, questions_data })
      .select()
      .single()

    if (error) {
      console.error('[repaso/historial POST] DB error:', error?.message)
      return NextResponse.json({ success: false, error: 'DB_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    console.error('[repaso/historial POST] Error:', e?.message)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
