// ──────────────────────────────────────────────────────────────────────────────
// MCP in-process de la app de Aprendizajes (mismo patrón que crm.mjs del CRM).
//
// Cada herramienta llama a la API HTTP de la app (/api/agent) con un Bearer token
// (AGENT_TOKEN). No toca Supabase directamente: reutiliza la lógica/validación de
// la app y respeta el modelo de datos (`learnings`, SRS, etc.).
//
// Se enchufa al asistente general (index.mjs del CRM) añadiendo:
//   import { aprendizajesServer, aprendizajesToolNames } from "./aprendizajes.mjs";
//   mcpServers: { ..., aprendizajes: aprendizajesServer }
//   allowedTools: [ ..., ...aprendizajesToolNames ]
//
// Sin coste de API: el razonamiento lo pone el Claude del SDK (tu suscripción).
// ──────────────────────────────────────────────────────────────────────────────
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = (process.env.APP_BASE_URL || "").replace(/\/+$/, "");
const TOKEN = process.env.AGENT_TOKEN || "";

// --- Cronómetro de práctica en vivo (estado local en el VPS) ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TIMERS_FILE = path.join(__dirname, "practice_timers.json");
const loadTimers = () => { try { return JSON.parse(fs.readFileSync(TIMERS_FILE, "utf8")); } catch { return {}; } };
const saveTimers = (t) => fs.writeFileSync(TIMERS_FILE, JSON.stringify(t, null, 2));
const fmtDur = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : (m ? `${m}m ${s % 60}s` : `${s}s`); };

// Llama a una herramienta de /api/agent y devuelve { ok, result } | { ok:false, error }.
async function callTool(name, args) {
  if (!BASE || !TOKEN) {
    return { ok: false, error: "Falta APP_BASE_URL y/o AGENT_TOKEN en el .env del agente." };
  }
  try {
    const res = await fetch(`${BASE}/api/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ tool: name, args: args || {} }),
      signal: AbortSignal.timeout(30000),
    });
    const json = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
    return json;
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// Envoltura uniforme para el SDK.
const reply = (out) =>
  out.ok
    ? { content: [{ type: "text", text: JSON.stringify(out.result, null, 2) }] }
    : { content: [{ type: "text", text: `ERROR: ${out.error}` }], isError: true };

// Helper para declarar una tool que reenvía a /api/agent con el mismo nombre.
const fwd = (name, description, shape) =>
  tool(name, description, shape, async (args) => reply(await callTool(name, args)));

export const aprendizajesServer = createSdkMcpServer({
  name: "aprendizajes",
  version: "1.0.0",
  tools: [
    // -------- Sectores --------
    fwd("list_sectors", "Lista los 9 sectores de conocimiento con el nº de aprendizajes en cada uno.", {}),

    // -------- Aprendizajes --------
    fwd(
      "search_learnings",
      "Busca aprendizajes por texto (título/resumen), sector y/o favoritos. Vista compacta.",
      {
        query: z.string().optional().describe("texto a buscar"),
        sector_id: z.string().optional().describe("health|nature|physics|math|tech|history|arts|economy|society"),
        favorites_only: z.boolean().optional(),
        limit: z.number().optional().describe("1-50, por defecto 20"),
      }
    ),
    fwd("get_learning", "Devuelve un aprendizaje completo por id (contenido, nota, SRS).", {
      id: z.string(),
    }),
    fwd(
      "create_learning",
      "Crea un aprendizaje (inicializa el repaso SRS). El texto lo redactas tú; esto solo lo guarda.",
      {
        sector_id: z.string().describe("health|nature|physics|math|tech|history|arts|economy|society"),
        title: z.string(),
        summary: z.string().describe("1-3 frases"),
        content: z.string().optional().describe("Markdown"),
        tags: z.array(z.string()).optional(),
        personal_note: z.string().optional(),
        is_favorite: z.boolean().optional(),
      }
    ),
    fwd("update_learning", "Actualiza campos de un aprendizaje. Envía solo lo que cambia.", {
      id: z.string(),
      title: z.string().optional(),
      summary: z.string().optional(),
      content: z.string().optional(),
      tags: z.array(z.string()).optional(),
      personal_note: z.string().optional(),
      is_favorite: z.boolean().optional(),
    }),
    fwd("delete_learning", "Borra un aprendizaje (borrado suave, se sincroniza). Confirma antes con el usuario.", {
      id: z.string(),
    }),

    // -------- Repaso / SRS --------
    fwd("get_review_today", "Lista los aprendizajes que toca repasar hoy (SRS vencido).", {
      limit: z.number().optional().describe("1-100, por defecto 50"),
    }),
    fwd("submit_review", "Registra un repaso y reprograma el SRS.", {
      id: z.string(),
      grade: z.enum(["again", "good", "easy"]).describe("again=olvidé, good=recordé, easy=fácil"),
    }),

    // -------- Examen / test --------
    fwd(
      "get_learnings_for_quiz",
      "Trae aprendizajes CON contenido para montar un examen. Genera tú las preguntas y registra el resultado con submit_review.",
      {
        mode: z.enum(["due", "sector", "random"]).optional().describe("due=repaso hoy (def), sector, random"),
        sector_id: z.string().optional().describe("requerido si mode=sector"),
        count: z.number().optional().describe("1-20, por defecto 5"),
      }
    ),

    // -------- Estadísticas --------
    fwd("get_stats", "Resumen del progreso: totales, por sector, favoritos, pendientes, repasos recientes.", {}),

    // -------- Habilidades / práctica (cronómetro) --------
    fwd("list_skills", "Lista las habilidades de práctica con su nivel y tiempo total. Úsala para encontrar el id de una (p.ej. Piano).", {}),
    fwd("create_skill", "Crea una habilidad nueva si no existe (Piano, Inglés, Correr...). Devuelve su id.", {
      nombre: z.string(),
      categoria: z.string().optional().describe("deportes, musica, arte, programacion, idiomas, cocina, bienestar, gaming, otra"),
    }),
    fwd("log_practice_session", "Guarda una sesión de práctica YA terminada (duración en segundos). Normalmente la llama stop_practice por ti.", {
      habilidad_id: z.string(),
      duracion_segundos: z.number(),
      resumen: z.string().optional(),
    }),
    tool(
      "start_practice",
      "Inicia el CRONÓMETRO de práctica de una habilidad (cuando Jorge dice cosas como 'estoy tocando el piano', 'me pongo a correr'). Pasa el habilidad_id (créalo antes con create_skill si no existe) y el nombre.",
      { habilidad_id: z.string(), nombre: z.string() },
      async ({ habilidad_id, nombre }) => {
        const timers = loadTimers();
        if (timers[habilidad_id]) {
          const el = Math.round((Date.now() - timers[habilidad_id].started_at) / 1000);
          return { content: [{ type: "text", text: `Ya había un cronómetro de "${timers[habilidad_id].nombre}" en marcha (${fmtDur(el)}).` }] };
        }
        timers[habilidad_id] = { nombre, started_at: Date.now() };
        saveTimers(timers);
        return { content: [{ type: "text", text: `⏱️ Cronómetro de "${nombre}" iniciado. Avísame cuando termines.` }] };
      }
    ),
    tool(
      "stop_practice",
      "Detiene el cronómetro y GUARDA la sesión con su duración (cuando Jorge dice 'ya terminé', 'paro', 'he acabado'). Si hay varias en marcha, pasa el habilidad_id; si solo hay una, no hace falta.",
      { habilidad_id: z.string().optional() },
      async ({ habilidad_id }) => {
        const timers = loadTimers();
        const ids = Object.keys(timers);
        if (ids.length === 0) return { content: [{ type: "text", text: "No hay ningún cronómetro en marcha." }] };
        let id = habilidad_id;
        if (!id) {
          if (ids.length === 1) id = ids[0];
          else return { content: [{ type: "text", text: `Hay varias prácticas en marcha: ${ids.map((i) => timers[i].nombre).join(", ")}. ¿Cuál paro?` }], isError: true };
        }
        const t = timers[id];
        if (!t) return { content: [{ type: "text", text: "No encuentro ese cronómetro." }], isError: true };
        const dur = Math.max(1, Math.round((Date.now() - t.started_at) / 1000));
        delete timers[id];
        saveTimers(timers);
        const out = await callTool("log_practice_session", { habilidad_id: id, duracion_segundos: dur });
        if (!out.ok) {
          // Re-guardamos el cronómetro para no perder el tiempo medido.
          timers[id] = t;
          saveTimers(timers);
          return { content: [{ type: "text", text: `Medí ${fmtDur(dur)} de "${t.nombre}" pero no pude guardarlo: ${out.error}` }], isError: true };
        }
        const r = out.result || {};
        return { content: [{ type: "text", text: `✅ "${t.nombre}": ${fmtDur(dur)} practicados. Total acumulado: ${r.nuevo_tiempo_total_texto || "?"} (nivel: ${r.nivel || "?"}).` }] };
      }
    ),
    tool(
      "practice_status",
      "Muestra qué cronómetros de práctica están en marcha y cuánto llevan.",
      {},
      async () => {
        const timers = loadTimers();
        const ids = Object.keys(timers);
        if (!ids.length) return { content: [{ type: "text", text: "No hay prácticas en marcha." }] };
        const lines = ids.map((i) => `• ${timers[i].nombre}: ${fmtDur(Math.round((Date.now() - timers[i].started_at) / 1000))}`).join("\n");
        return { content: [{ type: "text", text: lines }] };
      }
    ),
    fwd("list_reminders", "Lista recordatorios de práctica (opcional: filtra por habilidad_id).", {
      habilidad_id: z.string().optional(),
    }),
    fwd("create_reminder", "Crea un recordatorio semanal. dia_semana 0=domingo..6=sábado. hora HH:MM.", {
      habilidad_id: z.string(),
      dia_semana: z.number().describe("0-6"),
      hora: z.string().describe("HH:MM"),
    }),
    fwd("delete_reminder", "Desactiva un recordatorio por id.", { id: z.string() }),

    // -------- Hábitos --------
    fwd("list_habits", "Lista tus hábitos con racha y estado de hoy.", {}),
    fwd("mark_habit_done", "Marca un hábito como completado hoy.", { id: z.string() }),
  ],
});

export const aprendizajesToolNames = [
  "list_sectors",
  "search_learnings",
  "get_learning",
  "create_learning",
  "update_learning",
  "delete_learning",
  "get_review_today",
  "submit_review",
  "get_learnings_for_quiz",
  "get_stats",
  "list_skills",
  "create_skill",
  "log_practice_session",
  "start_practice",
  "stop_practice",
  "practice_status",
  "list_reminders",
  "create_reminder",
  "delete_reminder",
  "list_habits",
  "mark_habit_done",
].map((n) => `mcp__aprendizajes__${n}`);
