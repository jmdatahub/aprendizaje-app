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

const BASE = (process.env.APP_BASE_URL || "").replace(/\/+$/, "");
const TOKEN = process.env.AGENT_TOKEN || "";

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

    // -------- Habilidades / recordatorios --------
    fwd("list_skills", "Lista las habilidades de práctica.", {}),
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
  "list_reminders",
  "create_reminder",
  "delete_reminder",
  "list_habits",
  "mark_habit_done",
].map((n) => `mcp__aprendizajes__${n}`);
