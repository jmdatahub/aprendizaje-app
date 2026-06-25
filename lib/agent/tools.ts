/**
 * Capa de "herramientas del agente".
 *
 * Expone TODO el sistema de la app de aprendizajes como un catálogo de
 * herramientas (tools) deterministas que un agente externo puede invocar.
 *
 * Diseño "sin API de pago": este módulo NO llama a ningún LLM. El razonamiento
 * (entender los mensajes de Telegram, decidir qué herramienta usar) lo hace el
 * "cerebro" Claude que corre en el VPS, exactamente igual que el asistente del
 * CRM. Aquí solo vive la lógica de negocio: leer/escribir en Supabase reutilizando
 * el mismo algoritmo SRS y las mismas tablas que la app web/móvil.
 *
 * Fuente de verdad de los aprendizajes: la tabla `learnings` (espejo sincronizado
 * del localStorage del móvil vía /api/learnings/sync, last-write-wins por
 * `updated_at`). Si el agente escribe aquí con un `updated_at` fresco, el móvil
 * lo recoge en su próximo sync.
 */
import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { initSrs, reviewSrs, isDue, daysUntilDue, type SrsState, type ReviewGrade } from '@/lib/srs'
import { SECTORES_DATA } from '@/shared/constants/sectores'
import { calcularNivel, formatearTiempo } from '@/shared/constants/habilidades'

// --------------------------------------------------------------------------
// Tipos
// --------------------------------------------------------------------------

export interface ToolContext {
  supabase: SupabaseClient
  now: Date
}

export interface ToolDef {
  name: string
  description: string
  /** JSON Schema del input — se sirve tal cual al servidor MCP. */
  inputSchema: Record<string, unknown>
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>
}

interface LearningRow {
  id: string
  sector_id: string
  title: string | null
  summary: string | null
  content: string | null
  tags: string[] | null
  is_favorite: boolean | null
  personal_note: string | null
  srs: SrsState | null
  review_history: { date: string }[] | null
  item_date: string | null
  updated_at: string | null
  deleted_at: string | null
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

const VALID_SECTORS = new Set(SECTORES_DATA.map((s) => s.id))
const VALID_GRADES = new Set<ReviewGrade>(['again', 'good', 'easy'])

class ToolError extends Error {}

function requireString(args: Record<string, unknown>, key: string, max = 5000): string {
  const v = args[key]
  if (typeof v !== 'string' || v.trim().length === 0) {
    throw new ToolError(`Falta el parámetro "${key}" (texto requerido).`)
  }
  if (v.length > max) throw new ToolError(`El parámetro "${key}" es demasiado largo.`)
  return v.trim()
}

function optString(args: Record<string, unknown>, key: string, max = 200000): string | undefined {
  const v = args[key]
  if (v === undefined || v === null) return undefined
  if (typeof v !== 'string') throw new ToolError(`El parámetro "${key}" debe ser texto.`)
  if (v.length > max) throw new ToolError(`El parámetro "${key}" es demasiado largo.`)
  return v.trim()
}

function requireSector(args: Record<string, unknown>): string {
  const sector = requireString(args, 'sector_id', 64).toLowerCase()
  if (!VALID_SECTORS.has(sector)) {
    throw new ToolError(`sector_id inválido. Válidos: ${[...VALID_SECTORS].join(', ')}.`)
  }
  return sector
}

function sectorMeta(id: string) {
  return SECTORES_DATA.find((s) => s.id === id)
}

/** Vista compacta de un aprendizaje para listados (sin el contenido completo). */
function toSummaryView(r: LearningRow, now: Date) {
  const due = r.srs ? isDue(r.srs, now) : false
  return {
    id: r.id,
    sector_id: r.sector_id,
    sector_icon: sectorMeta(r.sector_id)?.icono ?? '',
    title: r.title ?? 'Aprendizaje',
    summary: r.summary ?? '',
    tags: r.tags ?? [],
    is_favorite: !!r.is_favorite,
    item_date: r.item_date,
    due_for_review: due,
    days_until_review: r.srs ? daysUntilDue(r.srs, now) : null,
  }
}

// --------------------------------------------------------------------------
// Catálogo de herramientas
// --------------------------------------------------------------------------

export const TOOLS: ToolDef[] = [
  // ----------------------------- SECTORES --------------------------------
  {
    name: 'list_sectors',
    description:
      'Lista los 9 sectores de conocimiento (salud, naturaleza, física, matemáticas, tecnología, historia, arte, economía, sociedad) con el nº de aprendizajes en cada uno. Útil para orientarte antes de crear o buscar.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async handler(_args, { supabase }) {
      const { data, error } = await supabase
        .from('learnings')
        .select('sector_id')
        .is('deleted_at', null)
        .limit(10000)
      if (error) throw new ToolError(error.message)
      const counts = new Map<string, number>()
      for (const r of (data || []) as { sector_id: string }[]) {
        counts.set(r.sector_id, (counts.get(r.sector_id) || 0) + 1)
      }
      return SECTORES_DATA.map((s) => ({
        id: s.id,
        icon: s.icono,
        count: counts.get(s.id) || 0,
      }))
    },
  },

  // ---------------------------- APRENDIZAJES -----------------------------
  {
    name: 'search_learnings',
    description:
      'Busca aprendizajes por texto (en título y resumen), sector y/o favoritos. Devuelve una vista compacta (sin el contenido completo). Usa get_learning para leer uno entero.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texto a buscar en título/resumen (opcional).' },
        sector_id: { type: 'string', description: 'Filtrar por sector (opcional).' },
        favorites_only: { type: 'boolean', description: 'Solo favoritos (opcional).' },
        limit: { type: 'number', description: 'Máx. resultados (1-50, por defecto 20).' },
      },
      additionalProperties: false,
    },
    async handler(args, { supabase, now }) {
      const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50)
      let q = supabase
        .from('learnings')
        .select('id,sector_id,title,summary,tags,is_favorite,srs,item_date')
        .is('deleted_at', null)
        .order('item_date', { ascending: false, nullsFirst: false })
        .limit(limit)

      const sector = optString(args, 'sector_id', 64)
      if (sector) q = q.eq('sector_id', sector.toLowerCase())
      if (args.favorites_only === true) q = q.eq('is_favorite', true)

      const query = optString(args, 'query', 100)
      if (query) {
        const safe = query.replace(/[%_\\]/g, '\\$&')
        q = q.or(`title.ilike.%${safe}%,summary.ilike.%${safe}%`)
      }

      const { data, error } = await q
      if (error) throw new ToolError(error.message)
      const rows = (data || []) as LearningRow[]
      return { count: rows.length, items: rows.map((r) => toSummaryView(r, now)) }
    },
  },
  {
    name: 'get_learning',
    description: 'Devuelve un aprendizaje completo por su id, incluido el contenido, la nota personal y el estado de repaso (SRS).',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'id del aprendizaje.' } },
      required: ['id'],
      additionalProperties: false,
    },
    async handler(args, { supabase, now }) {
      const id = requireString(args, 'id', 200)
      const { data, error } = await supabase.from('learnings').select('*').eq('id', id).is('deleted_at', null).maybeSingle()
      if (error) throw new ToolError(error.message)
      if (!data) throw new ToolError('No existe un aprendizaje con ese id (o está borrado).')
      const r = data as LearningRow
      return {
        ...toSummaryView(r, now),
        content: r.content ?? '',
        personal_note: r.personal_note ?? '',
        srs: r.srs,
        review_count: Array.isArray(r.review_history) ? r.review_history.length : 0,
        updated_at: r.updated_at,
      }
    },
  },
  {
    name: 'create_learning',
    description:
      'Crea un aprendizaje nuevo en un sector. El SRS se inicializa para que entre en "repasar hoy". Importante: el texto (título, resumen, contenido) lo redactas TÚ con tu propio razonamiento; esta herramienta solo lo guarda.',
    inputSchema: {
      type: 'object',
      properties: {
        sector_id: { type: 'string', description: 'Uno de: health, nature, physics, math, tech, history, arts, economy, society.' },
        title: { type: 'string', description: 'Título corto del aprendizaje.' },
        summary: { type: 'string', description: 'Resumen de 1-3 frases.' },
        content: { type: 'string', description: 'Contenido completo en Markdown (opcional).' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Etiquetas (opcional).' },
        personal_note: { type: 'string', description: 'Nota personal (opcional).' },
        is_favorite: { type: 'boolean', description: 'Marcar como favorito (opcional).' },
      },
      required: ['sector_id', 'title', 'summary'],
      additionalProperties: false,
    },
    async handler(args, { supabase, now }) {
      const sector_id = requireSector(args)
      const title = requireString(args, 'title', 500)
      const summary = requireString(args, 'summary', 20000)
      const content = optString(args, 'content', 200000) ?? ''
      const personal_note = optString(args, 'personal_note', 5000) ?? null
      const tags = Array.isArray(args.tags)
        ? (args.tags as unknown[]).slice(0, 50).map((t) => String(t).slice(0, 100))
        : []
      const nowIso = now.toISOString()
      const row = {
        id: randomUUID(),
        sector_id,
        title,
        summary,
        content,
        tags,
        is_favorite: args.is_favorite === true,
        personal_note,
        srs: initSrs(now),
        review_history: [],
        item_date: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      }
      const { data, error } = await supabase.from('learnings').insert(row).select().single()
      if (error) throw new ToolError(error.message)
      return { created: true, id: row.id, learning: toSummaryView(data as LearningRow, now) }
    },
  },
  {
    name: 'update_learning',
    description: 'Actualiza campos de un aprendizaje existente (título, resumen, contenido, etiquetas, nota personal, favorito). Solo envía los campos que cambian.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        summary: { type: 'string' },
        content: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        personal_note: { type: 'string' },
        is_favorite: { type: 'boolean' },
      },
      required: ['id'],
      additionalProperties: false,
    },
    async handler(args, { supabase, now }) {
      const id = requireString(args, 'id', 200)
      const patch: Record<string, unknown> = { updated_at: now.toISOString() }
      const title = optString(args, 'title', 500)
      if (title !== undefined) patch.title = title
      const summary = optString(args, 'summary', 20000)
      if (summary !== undefined) patch.summary = summary
      const content = optString(args, 'content', 200000)
      if (content !== undefined) patch.content = content
      const note = optString(args, 'personal_note', 5000)
      if (note !== undefined) patch.personal_note = note
      if (typeof args.is_favorite === 'boolean') patch.is_favorite = args.is_favorite
      if (Array.isArray(args.tags)) patch.tags = (args.tags as unknown[]).slice(0, 50).map((t) => String(t).slice(0, 100))

      const { data, error } = await supabase
        .from('learnings')
        .update(patch)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .maybeSingle()
      if (error) throw new ToolError(error.message)
      if (!data) throw new ToolError('No existe un aprendizaje con ese id (o está borrado).')
      return { updated: true, learning: toSummaryView(data as LearningRow, now) }
    },
  },
  {
    name: 'delete_learning',
    description: 'Borra un aprendizaje (borrado suave / tombstone). El borrado se propaga a todos tus dispositivos en el próximo sync.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    },
    async handler(args, { supabase, now }) {
      const id = requireString(args, 'id', 200)
      const nowIso = now.toISOString()
      const { data, error } = await supabase
        .from('learnings')
        .update({ deleted_at: nowIso, updated_at: nowIso })
        .eq('id', id)
        .is('deleted_at', null)
        .select('id')
        .maybeSingle()
      if (error) throw new ToolError(error.message)
      if (!data) throw new ToolError('No existe un aprendizaje activo con ese id.')
      return { deleted: true, id }
    },
  },

  // ------------------------------ REPASO / SRS ---------------------------
  {
    name: 'get_review_today',
    description: 'Lista los aprendizajes que toca repasar HOY según el algoritmo de repetición espaciada (SRS vencido). Ordenados del más vencido al menos.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Máx. resultados (1-100, por defecto 50).' } },
      additionalProperties: false,
    },
    async handler(args, { supabase, now }) {
      const limit = Math.min(Math.max(Number(args.limit) || 50, 1), 100)
      const { data, error } = await supabase
        .from('learnings')
        .select('id,sector_id,title,summary,tags,is_favorite,srs,item_date')
        .is('deleted_at', null)
        .not('srs', 'is', null)
        .limit(5000)
      if (error) throw new ToolError(error.message)
      const due = ((data || []) as LearningRow[])
        .filter((r) => r.srs && isDue(r.srs, now))
        .sort((a, b) => new Date(a.srs!.dueDate).getTime() - new Date(b.srs!.dueDate).getTime())
        .slice(0, limit)
      return { count: due.length, items: due.map((r) => toSummaryView(r, now)) }
    },
  },
  {
    name: 'submit_review',
    description:
      'Registra el resultado de un repaso de un aprendizaje y reprograma el SRS. grade: "again" (lo olvidé), "good" (lo recordé), "easy" (muy fácil). Devuelve cuándo toca el próximo repaso.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        grade: { type: 'string', enum: ['again', 'good', 'easy'] },
      },
      required: ['id', 'grade'],
      additionalProperties: false,
    },
    async handler(args, { supabase, now }) {
      const id = requireString(args, 'id', 200)
      const grade = requireString(args, 'grade', 10) as ReviewGrade
      if (!VALID_GRADES.has(grade)) throw new ToolError('grade debe ser "again", "good" o "easy".')

      const { data, error } = await supabase
        .from('learnings')
        .select('srs,review_history')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle()
      if (error) throw new ToolError(error.message)
      if (!data) throw new ToolError('No existe un aprendizaje activo con ese id.')

      const prevSrs = (data as LearningRow).srs ?? undefined
      const newSrs = reviewSrs(prevSrs, grade, now)
      const history = Array.isArray((data as LearningRow).review_history) ? (data as LearningRow).review_history! : []
      const nowIso = now.toISOString()

      const { error: upErr } = await supabase
        .from('learnings')
        .update({ srs: newSrs, review_history: [...history, { date: nowIso }], updated_at: nowIso })
        .eq('id', id)
      if (upErr) throw new ToolError(upErr.message)

      return {
        reviewed: true,
        id,
        grade,
        next_review_date: newSrs.dueDate,
        interval_days: newSrs.intervalDays,
      }
    },
  },
  {
    name: 'get_learnings_for_quiz',
    description:
      'Devuelve aprendizajes CON su contenido completo para montar un examen/test rápido. Por defecto toma los que tocan repasar hoy (mode="due"); también puedes pedir de un sector ("sector") o aleatorios ("random"). Flujo: genera tú las preguntas a partir del contenido, evalúa las respuestas de Jorge y registra cada resultado con submit_review (again/good/easy).',
    inputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['due', 'sector', 'random'], description: 'due (por defecto), sector o random.' },
        sector_id: { type: 'string', description: 'Requerido si mode="sector".' },
        count: { type: 'number', description: 'Nº de aprendizajes (1-20, por defecto 5).' },
      },
      additionalProperties: false,
    },
    async handler(args, { supabase, now }) {
      const count = Math.min(Math.max(Number(args.count) || 5, 1), 20)
      const mode = (optString(args, 'mode', 10) || 'due').toLowerCase()
      const cols = 'id,sector_id,title,summary,content,tags,srs,item_date'

      let rows: LearningRow[] = []
      if (mode === 'sector') {
        const sector = requireSector(args)
        const { data, error } = await supabase
          .from('learnings')
          .select(cols)
          .is('deleted_at', null)
          .eq('sector_id', sector)
          .order('item_date', { ascending: false, nullsFirst: false })
          .limit(count)
        if (error) throw new ToolError(error.message)
        rows = (data || []) as LearningRow[]
      } else if (mode === 'random') {
        const { data, error } = await supabase.from('learnings').select(cols).is('deleted_at', null).limit(500)
        if (error) throw new ToolError(error.message)
        const pool = (data || []) as LearningRow[]
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[pool[i], pool[j]] = [pool[j], pool[i]]
        }
        rows = pool.slice(0, count)
      } else {
        // due
        const { data, error } = await supabase
          .from('learnings')
          .select(cols)
          .is('deleted_at', null)
          .not('srs', 'is', null)
          .limit(5000)
        if (error) throw new ToolError(error.message)
        rows = ((data || []) as LearningRow[])
          .filter((r) => r.srs && isDue(r.srs, now))
          .sort((a, b) => new Date(a.srs!.dueDate).getTime() - new Date(b.srs!.dueDate).getTime())
          .slice(0, count)
      }

      return {
        mode,
        count: rows.length,
        items: rows.map((r) => ({
          id: r.id,
          sector_id: r.sector_id,
          title: r.title ?? 'Aprendizaje',
          summary: r.summary ?? '',
          content: (r.content ?? '').slice(0, 8000),
          tags: r.tags ?? [],
        })),
      }
    },
  },

  // ------------------------------ ESTADÍSTICAS ---------------------------
  {
    name: 'get_stats',
    description: 'Resumen del progreso: total de aprendizajes, reparto por sector, favoritos, pendientes de repaso hoy, repasos en los últimos 7 días y aprendizajes creados en los últimos 7/30 días.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async handler(_args, { supabase, now }) {
      const { data, error } = await supabase
        .from('learnings')
        .select('sector_id,is_favorite,srs,review_history,item_date')
        .is('deleted_at', null)
        .limit(10000)
      if (error) throw new ToolError(error.message)
      const rows = (data || []) as LearningRow[]

      const bySector = new Map<string, number>()
      let favorites = 0
      let dueToday = 0
      let reviews7d = 0
      let created7d = 0
      let created30d = 0
      const ms = now.getTime()
      const d7 = ms - 7 * 86400000
      const d30 = ms - 30 * 86400000

      for (const r of rows) {
        bySector.set(r.sector_id, (bySector.get(r.sector_id) || 0) + 1)
        if (r.is_favorite) favorites++
        if (r.srs && isDue(r.srs, now)) dueToday++
        if (Array.isArray(r.review_history)) {
          for (const h of r.review_history) {
            const t = new Date(h.date).getTime()
            if (!isNaN(t) && t >= d7) reviews7d++
          }
        }
        if (r.item_date) {
          const t = new Date(r.item_date).getTime()
          if (!isNaN(t)) {
            if (t >= d7) created7d++
            if (t >= d30) created30d++
          }
        }
      }

      return {
        total_learnings: rows.length,
        favorites,
        due_for_review_today: dueToday,
        reviews_last_7_days: reviews7d,
        created_last_7_days: created7d,
        created_last_30_days: created30d,
        by_sector: SECTORES_DATA.map((s) => ({ id: s.id, icon: s.icono, count: bySector.get(s.id) || 0 })),
      }
    },
  },

  // ------------------------- HABILIDADES / RECORDATORIOS -----------------
  {
    name: 'list_skills',
    description: 'Lista las habilidades (prácticas) registradas, con su nivel y tiempo total practicado. Úsala para encontrar el id de una habilidad (p.ej. "Piano") antes de cronometrar o registrar práctica.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async handler(_args, { supabase }) {
      const { data, error } = await supabase
        .from('habilidades')
        .select('id,nombre,nivel,tiempo_total_segundos')
        .is('deleted_at', null)
        .order('nombre', { ascending: true })
        .limit(500)
      if (error) throw new ToolError(error.message)
      const items = ((data || []) as { id: string; nombre: string; nivel: string; tiempo_total_segundos: number | null }[]).map((h) => ({
        id: h.id,
        nombre: h.nombre,
        nivel: h.nivel,
        tiempo_total: formatearTiempo(Number(h.tiempo_total_segundos || 0)),
      }))
      return { count: items.length, items }
    },
  },
  {
    name: 'create_skill',
    description: 'Crea una habilidad de práctica nueva (p.ej. "Piano", "Inglés", "Correr") si no existe aún. Devuelve su id para luego cronometrar o registrar sesiones. Empieza en nivel novato con 0 tiempo.',
    inputSchema: {
      type: 'object',
      properties: {
        nombre: { type: 'string', description: 'Nombre de la habilidad.' },
        categoria: { type: 'string', description: 'Opcional: deportes, musica, arte, programacion, idiomas, cocina, bienestar, gaming, otra.' },
      },
      required: ['nombre'],
      additionalProperties: false,
    },
    async handler(args, { supabase, now }) {
      const nombre = requireString(args, 'nombre', 255)
      const categoria = optString(args, 'categoria', 50)
      const { data, error } = await supabase
        .from('habilidades')
        .insert({
          nombre,
          categorias: categoria ? [categoria] : [],
          tiempo_total_segundos: 0,
          nivel: calcularNivel(0).id,
          updated_at: now.toISOString(),
        })
        .select('id,nombre,nivel')
        .single()
      if (error) throw new ToolError(error.message)
      return { created: true, skill: data }
    },
  },
  {
    name: 'log_practice_session',
    description:
      'Registra una sesión de práctica YA TERMINADA de una habilidad: guarda la duración (en segundos) y actualiza el tiempo total y el nivel. Para cronometrar en vivo desde Telegram usa start_practice/stop_practice (que llaman a esta al final).',
    inputSchema: {
      type: 'object',
      properties: {
        habilidad_id: { type: 'string', description: 'UUID de la habilidad.' },
        duracion_segundos: { type: 'number', description: 'Duración en segundos (1 a 86400).' },
        resumen: { type: 'string', description: 'Opcional: qué practicaste.' },
      },
      required: ['habilidad_id', 'duracion_segundos'],
      additionalProperties: false,
    },
    async handler(args, { supabase, now }) {
      const habilidad_id = requireString(args, 'habilidad_id', 36)
      const dur = Number(args.duracion_segundos)
      if (!Number.isFinite(dur) || dur <= 0 || dur > 86400) {
        throw new ToolError('duracion_segundos debe estar entre 1 y 86400 (24h).')
      }
      const duracion = Math.round(dur)
      const resumen = optString(args, 'resumen', 2000) ?? null

      const { data: hab, error: getErr } = await supabase
        .from('habilidades')
        .select('tiempo_total_segundos')
        .eq('id', habilidad_id)
        .is('deleted_at', null)
        .maybeSingle()
      if (getErr) throw new ToolError(getErr.message)
      if (!hab) throw new ToolError('No existe una habilidad con ese id.')

      const previo = Number((hab as { tiempo_total_segundos: number | null }).tiempo_total_segundos || 0)
      const nuevoTotal = Math.min(previo + duracion, 1_000_000_000)
      const nuevoNivel = calcularNivel(nuevoTotal)

      const { error: insErr } = await supabase
        .from('sesiones_practica')
        .insert({ habilidad_id, duracion_segundos: duracion, resumen })
      if (insErr) throw new ToolError(insErr.message)

      await supabase
        .from('habilidades')
        .update({ tiempo_total_segundos: nuevoTotal, nivel: nuevoNivel.id, updated_at: now.toISOString() })
        .eq('id', habilidad_id)

      return {
        saved: true,
        duracion_segundos: duracion,
        duracion_texto: formatearTiempo(duracion),
        nuevo_tiempo_total: nuevoTotal,
        nuevo_tiempo_total_texto: formatearTiempo(nuevoTotal),
        nivel: nuevoNivel.id,
      }
    },
  },
  {
    name: 'list_reminders',
    description: 'Lista los recordatorios de práctica. Puedes filtrar por habilidad (habilidad_id).',
    inputSchema: {
      type: 'object',
      properties: { habilidad_id: { type: 'string', description: 'UUID de la habilidad (opcional).' } },
      additionalProperties: false,
    },
    async handler(args, { supabase }) {
      let q = supabase
        .from('recordatorios')
        .select('id,habilidad_id,dia_semana,hora,active,email_enabled')
        .eq('active', true)
        .order('dia_semana', { ascending: true })
        .order('hora', { ascending: true })
        .limit(500)
      const hid = optString(args, 'habilidad_id', 36)
      if (hid) q = q.eq('habilidad_id', hid)
      const { data, error } = await q
      if (error) throw new ToolError(error.message)
      return { count: (data || []).length, items: data || [] }
    },
  },
  {
    name: 'create_reminder',
    description: 'Crea un recordatorio semanal de práctica para una habilidad. dia_semana: 0=domingo ... 6=sábado. hora en formato HH:MM (24h).',
    inputSchema: {
      type: 'object',
      properties: {
        habilidad_id: { type: 'string', description: 'UUID de la habilidad.' },
        dia_semana: { type: 'number', description: '0 (domingo) a 6 (sábado).' },
        hora: { type: 'string', description: 'HH:MM (24h), p.ej. "08:30".' },
      },
      required: ['habilidad_id', 'dia_semana', 'hora'],
      additionalProperties: false,
    },
    async handler(args, { supabase }) {
      const habilidad_id = requireString(args, 'habilidad_id', 36)
      const dia = Number(args.dia_semana)
      if (!Number.isInteger(dia) || dia < 0 || dia > 6) throw new ToolError('dia_semana debe ser un entero 0-6.')
      const hora = requireString(args, 'hora', 8)
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(hora)) throw new ToolError('hora debe tener formato HH:MM.')
      const { data, error } = await supabase
        .from('recordatorios')
        .insert({ habilidad_id, dia_semana: dia, hora, email_enabled: true, active: true })
        .select()
        .single()
      if (error) throw new ToolError(error.message)
      return { created: true, reminder: data }
    },
  },
  {
    name: 'delete_reminder',
    description: 'Desactiva un recordatorio por su id.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    },
    async handler(args, { supabase }) {
      const id = requireString(args, 'id', 36)
      const { data, error } = await supabase.from('recordatorios').update({ active: false }).eq('id', id).select('id').maybeSingle()
      if (error) throw new ToolError(error.message)
      if (!data) throw new ToolError('No existe un recordatorio con ese id.')
      return { deleted: true, id }
    },
  },

  // -------------------------------- HÁBITOS ------------------------------
  {
    name: 'list_habits',
    description: 'Lista tus hábitos con su racha y si están completados hoy.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async handler(_args, { supabase, now }) {
      const todayStr = now.toISOString().split('T')[0]
      const { data, error } = await supabase.from('habits').select('id,text,streak,habit_logs(completed_at)').limit(200)
      if (error) throw new ToolError(error.message)
      const items = ((data || []) as { id: string; text: string; streak: number; habit_logs?: { completed_at: string }[] }[]).map((h) => ({
        id: h.id,
        text: h.text,
        streak: h.streak,
        done_today: !!h.habit_logs?.some((l) => l.completed_at === todayStr),
      }))
      return {
        count: items.length,
        pending_today: items.filter((h) => !h.done_today).length,
        items,
      }
    },
  },
  {
    name: 'mark_habit_done',
    description: 'Marca un hábito como completado HOY (suma a la racha).',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    },
    async handler(args, { supabase, now }) {
      const id = requireString(args, 'id', 36)
      const todayStr = now.toISOString().split('T')[0]
      const { data: habit } = await supabase.from('habits').select('text,streak').eq('id', id).maybeSingle()
      if (!habit) throw new ToolError('No existe un hábito con ese id.')
      const { error } = await supabase.from('habit_logs').insert({ habit_id: id, completed_at: todayStr })
      if (error) {
        if (error.code === '23505') return { marked: false, reason: 'already_done_today', text: (habit as { text: string }).text }
        throw new ToolError(error.message)
      }
      return { marked: true, text: (habit as { text: string }).text, streak: (habit as { streak: number }).streak + 1 }
    },
  },
]

// --------------------------------------------------------------------------
// API pública
// --------------------------------------------------------------------------

const TOOL_MAP = new Map(TOOLS.map((t) => [t.name, t]))

/** Catálogo serializable (sin handlers) para el endpoint GET / descubrimiento MCP. */
export function getToolCatalog() {
  return TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
}

export type ToolResult = { ok: true; result: unknown } | { ok: false; error: string }

/** Ejecuta una herramienta por nombre. Nunca lanza: devuelve { ok:false } en error. */
export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const tool = TOOL_MAP.get(name)
  if (!tool) return { ok: false, error: `Herramienta desconocida: "${name}".` }
  try {
    const result = await tool.handler(args || {}, ctx)
    return { ok: true, result }
  } catch (e) {
    const msg = e instanceof ToolError ? e.message : 'Error interno ejecutando la herramienta.'
    if (!(e instanceof ToolError)) console.error(`[agent tool ${name}] error:`, e instanceof Error ? e.message : String(e))
    return { ok: false, error: msg }
  }
}
