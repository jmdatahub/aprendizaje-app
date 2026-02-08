import { NextResponse } from 'next/server'
import { ApiResponse } from '@/shared/types/api'

// Forward/Legacy wrapper for /api/aprender
// This endpoint now delegates to /api/aprender/generate or /api/aprender/save
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const { confirmar } = body || {}

    // Prepare internal request to the specialized endpoint
    const baseUrl = new URL(req.url).origin
    const targetPath = confirmar === true ? '/api/aprender/save' : '/api/aprender/generate'
    const targetUrl = new URL(targetPath, baseUrl)

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const result = await response.json()

    // For backward compatibility, the old API expected data at the top level,
    // but the new ones follow the { success, data } format.
    if (result.success && result.data) {
      return NextResponse.json({
        success: true,
        ...result.data
      })
    }

    return NextResponse.json(result, { status: response.status })

  } catch (e: any) {
    console.error('[API /api/aprender] Legacy wrapper error:', e)
    return NextResponse.json<ApiResponse>({ 
      success: false, 
      error: 'INTERNAL_ERROR', 
      message: 'Error en el wrapper de compatibilidad' 
    }, { status: 500 })
  }
}

