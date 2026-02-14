
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

// PATCH: Update habit fields
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = getSupabase()
    const body = await request.json()
    
    // Whitelist allowed fields to update
    const { text, category, with_notification, notification_times, custom_message } = body

    const updates: any = { updated_at: new Date().toISOString() }
    if (text !== undefined) updates.text = text
    if (category !== undefined) updates.category = category
    if (with_notification !== undefined) updates.with_notification = with_notification
    if (notification_times !== undefined) updates.notification_times = notification_times
    if (custom_message !== undefined) updates.custom_message = custom_message

    const { data, error } = await supabase
      .from('habits')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE: Remove habit
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = getSupabase()

    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
