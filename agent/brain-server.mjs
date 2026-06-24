#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────────────
// Servidor del "cerebro" para la APP (web/móvil) — IA sin coste de API.
//
// Mismo principio que el agente del CRM: usa el Claude Agent SDK con la
// suscripción del host (CLAUDE_CODE_OAUTH_TOKEN), NO la API de pago de OpenAI.
//
//   POST /complete   (Authorization: Bearer BRAIN_TOKEN)
//     body: { messages: [{role,content}], json?: boolean, model?: string }
//     resp: { ok: true, content: string } | { ok: false, error }
//   GET  /health  → { ok: true }
//
// La app (lib/openai.ts) enruta aquí cuando BRAIN_BASE_URL + BRAIN_TOKEN están
// configurados en Vercel. Debe ser accesible por HTTPS desde Vercel (Caddy/túnel).
//
// Env: BRAIN_TOKEN (obligatorio), BRAIN_PORT (8788), AGENT_MODEL/BRAIN_MODEL,
//      CLAUDE_CODE_OAUTH_TOKEN (la suscripción; el mismo que usa el CRM).
// ──────────────────────────────────────────────────────────────────────────────
import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { tmpdir } from "node:os";
import { query } from "@anthropic-ai/claude-agent-sdk";

const BRAIN_TOKEN = process.env.BRAIN_TOKEN || "";
const PORT = Number(process.env.BRAIN_PORT || 8788);
const DEFAULT_MODEL = process.env.BRAIN_MODEL || process.env.AGENT_MODEL || undefined;
const MAX_BODY = 256 * 1024;

if (!BRAIN_TOKEN) {
  console.error("[brain-server] Falta BRAIN_TOKEN en el entorno.");
  process.exit(1);
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
function authorized(req) {
  const h = req.headers["authorization"] || "";
  return h.startsWith("Bearer ") && safeEqual(h.slice(7), BRAIN_TOKEN);
}

function extractJson(text) {
  let t = String(text).trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const fObj = t.indexOf("{");
  const fArr = t.indexOf("[");
  let start = fObj === -1 ? fArr : fArr === -1 ? fObj : Math.min(fObj, fArr);
  if (start > 0) {
    const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
    if (end > start) t = t.slice(start, end + 1);
  }
  return t;
}

// Construye un único prompt a partir de los mensajes estilo OpenAI.
function buildPrompt(messages, json) {
  const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const convo = messages.filter((m) => m.role !== "system");
  const body =
    convo.length <= 1
      ? convo[0]?.content || ""
      : convo.map((m) => `${m.role === "user" ? "Usuario" : "Asistente"}: ${m.content}`).join("\n\n") + "\n\nAsistente:";
  const jsonInstr = json ? "\n\nResponde ÚNICAMENTE con un JSON válido, sin ``` ni texto adicional." : "";
  return [sys, body].filter(Boolean).join("\n\n") + jsonInstr;
}

// Completa con el SDK (suscripción). Sin herramientas, una sola pasada.
async function complete({ prompt, model }) {
  let result = "";
  for await (const message of query({
    prompt,
    options: {
      model: model || DEFAULT_MODEL,
      cwd: tmpdir(), // sin CLAUDE.md de proyecto: respuesta limpia
      permissionMode: "dontAsk",
      allowedTools: [],
      disallowedTools: ["Bash", "Write", "Edit", "Read", "NotebookEdit", "WebSearch", "WebFetch", "ToolSearch"],
      maxTurns: 1,
    },
  })) {
    if (message.type === "result") result = message.result || "";
  }
  return result;
}

function send(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
  if (req.method !== "POST" || req.url !== "/complete") return send(res, 404, { ok: false, error: "Not found" });
  if (!authorized(req)) return send(res, 401, { ok: false, error: "Unauthorized" });

  let body = "";
  let tooBig = false;
  req.on("data", (c) => {
    body += c;
    if (body.length > MAX_BODY) {
      tooBig = true;
      req.destroy();
    }
  });
  req.on("end", async () => {
    if (tooBig) return send(res, 413, { ok: false, error: "Body too large" });
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return send(res, 400, { ok: false, error: "JSON inválido" });
    }
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    if (!messages.length) return send(res, 400, { ok: false, error: "messages vacío" });
    try {
      const prompt = buildPrompt(messages, !!payload.json);
      let content = await complete({ prompt, model: typeof payload.model === "string" ? payload.model : undefined });
      if (payload.json) content = extractJson(content);
      return send(res, 200, { ok: true, content });
    } catch (e) {
      console.error("[brain-server] error:", e?.message || e);
      return send(res, 502, { ok: false, error: "Fallo del cerebro" });
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.error(`[brain-server] escuchando en 127.0.0.1:${PORT} · modelo "${DEFAULT_MODEL || "(default)"}"`);
});
