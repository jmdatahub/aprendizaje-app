import { NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@/lib/supabaseRoute'
import { ApiResponse } from '@/shared/types/api'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseForRequest(request)
    
    const { data, error } = await supabase
      .from('exam_history')
      .select('*')
      .order('created_at', { ascending: false })
      
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    console.error('[API /api/repaso/historial] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseForRequest(request)
    const body = await request.json()
    
    const { score, total_questions, questions_data } = body

    const { data, error } = await supabase
      .from('exam_history')
      .insert({
        score,
        total_questions,
        questions_data
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    console.error('[API /api/repaso/historial] POST Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
