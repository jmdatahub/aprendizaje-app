import { NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@/lib/supabaseRoute'
import OpenAI from 'openai'

export const runtime = 'nodejs'

const USE_STUB = process.env.USE_STUB_AI === '1'

// DetecciÃ³n aproximada de tema por palabras (misma heurÃ­stica que /api/chat)
function detectarTemaTexto(mensaje = '') {
  const m = (mensaje || '').toLowerCase()
  const mapa = [
    { nombre: 'Salud y Rendimiento', kw: ['salud','sueno','dormir','ejercicio','nutric','cardio'] },
    { nombre: 'Ciencias Naturales',  kw: ['natur','biolog','ecolog','planta','animal','ecosistema'] },
    { nombre: 'Ciencias Fisicas',    kw: ['fisic','energia','fuerza','mecan','cuant','relativ'] },
    { nombre: 'Matematicas y Logica',kw: ['mate','algebra','calculo','estad','probab','logica'] },
    { nombre: 'Tecnologia y Computacion', kw: ['tecno','program','codigo','software','comput','ia','redes'] },
    { nombre: 'Historia y Filosofia', kw: ['histori','filosof','etica','clasico','antigu'] },
    { nombre: 'Artes y Cultura',     kw: ['arte','museo','musica','pintur','cine','teatro'] },
    { nombre: 'Economia y Negocios', kw: ['econom','negocio','finanz','mercad','precio'] },
    { nombre: 'Sociedad y Psicologia', kw: ['socied','psicol','comunic','lengua','idioma'] },
  ]
  for (const t of mapa) if (t.kw.some(k => m.includes(k))) return t.nombre
  return 'Conocimiento General'
}

// Plantillas para el modo STUB (coinciden con /api/chat)
const RESPUESTAS_INICIO = [
  (t) => `Sobre ${t || 'este tema'}, te lo cuento en corto.`,
  (t) => `Vale, tomemos ${t || 'esto'} como foco y bajemoslo a lo esencial.`,
  (t) => `Buen punto con ${t || 'esto'}. Te doy una guia rapida.`,
  (t) => `Hablemos de ${t || 'esto'} con ejemplos simples.`,
  (t) => `Para aprender ${t || 'esto'}, pensemos en ideas clave.`,
  (t) => `Vamos directo: ${t || 'este tema'} se entiende mejor con pasos cortos.`,
  (t) => `Yo te acompano con ${t || 'esto'} y lo hacemos accionable.`,
  (t) => `Si arrancamos por lo basico de ${t || 'esto'}, todo encaja.`,
]
const RESPUESTAS_PROFUNDIZAR = [
  (msg) => `Traduce ${msg || 'tu duda'} a lenguaje cotidiano y separalo en concepto, utilidad y ejemplo.`,
  (msg) => `Piensa en: definicion en 1 linea, para que sirve y un mini ejemplo de diario.`,
  (msg) => `Una regla util: explica ${msg || 'la idea'} como si lo contaras a un amigo sin jerga.`,
]
const CIERRES = [
  () => 'Probamos con un ejemplo rapido?',
  () => 'Quieres que lo deje en 3 pasos?',
  () => 'Te propongo un mini ejercicio?',
  () => 'Seguimos con un caso sencillo?',
]
function makePlan3(t) {
  return [
    `1) Aclarar objetivo con ${t || 'el tema'} en 1 linea.`,
    `2) Ver 1 ejemplo pequeno con numeros simples.`,
    `3) Hacer una mini practica y revisar dudas.`,
  ].join('\n')
}
function stubInteligente(mensaje = '', tema = '') {
  const m = (mensaje || '').toLowerCase()
  const t = tema || detectarTemaTexto(mensaje)
  const conf = /(no entiendo|explica|explicame|que es)/i.test(m)
  const wantsEj = /(ejemplo|caso)/i.test(m)
  const wantsPlan = /(plan|guia|guÃ­a|pasos)/i.test(m)
  const inicio = RESPUESTAS_INICIO[Math.floor(Math.random()*RESPUESTAS_INICIO.length)](t)
  const profund = RESPUESTAS_PROFUNDIZAR[Math.floor(Math.random()*RESPUESTAS_PROFUNDIZAR.length)](mensaje)
  const cierre = CIERRES[Math.floor(Math.random()*CIERRES.length)]()
  if (wantsPlan) return `${inicio}\n${makePlan3(t)}\n${cierre}`
  if (wantsEj) {
    const ej = `Ejemplo corto: imagina ${t || 'el concepto'} aplicado a algo cotidiano; con valores 2, 3 y 5 ves el efecto sin complicarte.`
    return `${inicio}\n${ej}\n${cierre}`
  }
  if (conf) {
    const base = `Empecemos por la base de ${t}: que es, para que sirve y un ejemplo en 1 linea.`
    return `${inicio}\n${base}\n${cierre}`
  }
  return `${inicio}\n${profund}\n${cierre}`
}

// POST /api/chats/[id]/messages
// - Inserta mensaje del usuario en chat_mensajes
// - Genera respuesta (STUB u OpenAI) con historial breve del chat
// - Inserta respuesta de la IA y devuelve ambos
export async function POST(request, { params }) {
  try {
    const supabase = getSupabaseForRequest(request)
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const mensaje = (body?.mensaje ?? '').toString()
    const contexto = Array.isArray(body?.contexto) ? body.contexto : []
    if (!mensaje) return NextResponse.json({ error: 'Falta mensaje' }, { status: 400 })

    // 1) Cargar chat (tema, estado)
    const { data: chat, error: eChat } = await supabase
      .from('chats')
      .select('id,tema,estado')
      .eq('id', id)
      .single()
    if (eChat) throw new Error(eChat.message)
    if (!chat) return NextResponse.json({ error: 'Chat no encontrado' }, { status: 404 })
    if (chat.estado !== 'abierto') return NextResponse.json({ error: 'Chat cerrado' }, { status: 400 })

    // 2) Insertar mensaje de usuario
    const { data: mu, error: eMu } = await supabase
      .from('chat_mensajes')
      .insert([{ chat_id: id, rol: 'usuario', texto: mensaje }])
      .select('id,rol,texto,created_at')
      .single()
    if (eMu) throw new Error(eMu.message)

    // 3) Recuperar historial reciente para contexto (ultimos 16)
    const { data: hist, error: eHist } = await supabase
      .from('chat_mensajes')
      .select('rol,texto')
      .eq('chat_id', id)
      .order('created_at', { ascending: true })
    if (eHist) throw new Error(eHist.message)
    const conversacion = (hist || []).slice(-16).map((m) => ({ rol: m.rol, texto: m.texto }))

    // 4) Generar respuesta con STUB u OpenAI (misma politica que /api/chat)
    let respuesta = ''
    let engine = 'stub'
    const apiKey = process.env.OPENAI_API_KEY
    if (!USE_STUB && apiKey) {
      const openai = new OpenAI({ apiKey })
      const systemText = [
        'Eres un tutor amable y directo. Responde con frases naturales y concisas (3-6 lineas).',
        'Usa numeracion solo cuando listes pasos o razones, y que quede ordenada. Evita parrafos largos y markdown complejo.',
        'Si resaltas, puedes usar **texto**. Termina con una pregunta util.'
      ].join(' ')
      const ctxMsgs = contexto.slice(-10).map((m) => ({ role: m?.rol === 'ia' ? 'assistant' : 'user', content: (m?.texto ?? '').toString() }))
      const messages = [
        { role: 'system', content: systemText },
        ...(chat.tema ? [{ role: 'user', content: `Tema inicial: ${chat.tema}` }] : []),
        ...ctxMsgs,
        ...conversacion.map((m) => ({ role: m.rol === 'ia' ? 'assistant' : 'user', content: m.texto })),
        { role: 'user', content: mensaje },
      ]
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 512,
        messages,
      })
      respuesta = completion.choices?.[0]?.message?.content ?? 'Sin contenido.'
      engine = 'openai-gpt-4o-mini'
    } else {
      const tema = (chat?.tema || detectarTemaTexto(mensaje))
      const extra = contexto.length ? `Contexto previo: ${(contexto[contexto.length-1]?.texto || '').toString().slice(0,120)}. ` : ''
      respuesta = extra + stubInteligente(mensaje, tema)
      engine = 'stub'
    }

    // 5) Insertar respuesta de la IA
    const { data: mi, error: eMi } = await supabase
      .from('chat_mensajes')
      .insert([{ chat_id: id, rol: 'ia', texto: respuesta }])
      .select('id,rol,texto,created_at')
      .single()
    if (eMi) throw new Error(eMi.message)

    return NextResponse.json({ ok: true, usuario: mu, ia: mi, engine })
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 })
  }
}
