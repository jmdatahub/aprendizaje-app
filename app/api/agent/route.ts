/**
 * /api/agent — superficie de herramientas para el "cerebro" externo (Claude del VPS).
 *
 * - GET  → catálogo de herramientas (nombre, descripción, JSON Schema). Para que
 *          el servidor MCP las registre dinámicamente.
 * - POST → ejecuta una herramienta: body { tool: string, args: object }.
 *
 * Autenticación: cabecera `Authorization: Bearer <AGENT_TOKEN>` (comparación
 * en tiempo constante). Es un canal servidor-a-servidor de confianza, por eso
 * usa el cliente con service-role (igual que el webhook de Telegram). NUNCA
 * expongas AGENT_TOKEN en el cliente.
 *
 * Diseño "sin API de pago": este endpoint no llama a ningún LLM. Solo ejecuta
 * lógica de negocio determinista. El razonamiento lo pone el agente que llama.
 */
import { NextResponse } from 'next/server'
import { verifyBearer } from '@/lib/validate'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { getSupabaseAdmin } from '@/lib/supabaseAnonClient'
import { getToolCatalog, runTool } from '@/lib/agent/tools'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authorized(request: Request): boolean {
  const expected = process.env.AGENT_TOKEN
  if (!expected) {
    console.error('[agent] AGENT_TOKEN no configurado — se rechazan todas las peticiones')
    return false
  }
  return verifyBearer(request.headers.get('authorization'), expected)
}

export async function GET(request: Request) {
  if (!process.env.AGENT_TOKEN) {
    return NextResponse.json({ ok: false, error: 'NOT_CONFIGURED' }, { status: 503 })
  }
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }
  return NextResponse.json({ ok: true, tools: getToolCatalog() })
}

export async function POST(request: Request) {
  if (!process.env.AGENT_TOKEN) {
    return NextResponse.json({ ok: false, error: 'NOT_CONFIGURED' }, { status: 503 })
  }
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  // Rate limit: 120 llamadas/min por IP (suficiente para una conversación activa).
  const ip = getClientIp(request)
  const { success: allowed } = await rateLimit(`agent:${ip}`, 120, 60)
  if (!allowed) {
    return NextResponse.json({ ok: false, error: 'RATE_LIMITED' }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'INVALID_BODY' }, { status: 400 })
  }
  const { tool, args } = body as { tool?: unknown; args?: unknown }
  if (typeof tool !== 'string' || tool.length === 0 || tool.length > 64) {
    return NextResponse.json({ ok: false, error: 'INVALID_TOOL' }, { status: 400 })
  }
  if (args !== undefined && (typeof args !== 'object' || args === null || Array.isArray(args))) {
    return NextResponse.json({ ok: false, error: 'INVALID_ARGS' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const outcome = await runTool(tool, (args as Record<string, unknown>) || {}, { supabase, now: new Date() })

  if (!outcome.ok) {
    // Errores de validación/negocio → 200 con ok:false para que el agente los lea
    // como resultado de herramienta (no como fallo de transporte).
    return NextResponse.json(outcome)
  }
  return NextResponse.json(outcome)
}
