// ──────────────────────────────────────────────────────────────────────────────
// Bot de Telegram DEDICADO a aprendizajes (mismo patrón que el del CRM).
//
// Claude Agent SDK (suscripción del host, sin API de pago) + grammy.
// Tools de aprendizajes via aprendizajes.mjs (llaman a /api/agent de la app).
// Single-user: solo responde a ALLOWED_TELEGRAM_USER_ID.
//
// Env (.env):
//   TELEGRAM_BOT_TOKEN        token del bot dedicado (BotFather)
//   ALLOWED_TELEGRAM_USER_ID  tu user id de Telegram
//   APP_BASE_URL              https://TU-APP.vercel.app
//   AGENT_TOKEN               el mismo que en Vercel
//   AGENT_MODEL               (opcional) sonnet | opus
//   GROQ_API_KEY              (opcional) transcripción de notas de voz
//   TTS_VOICE                 (opcional) voz por defecto edge-tts
//   CLAUDE_CODE_OAUTH_TOKEN   la suscripción (claude setup-token)
// ──────────────────────────────────────────────────────────────────────────────
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Bot, InputFile } from "grammy";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { aprendizajesServer, aprendizajesToolNames } from "./aprendizajes.mjs";

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_ID = Number(process.env.ALLOWED_TELEGRAM_USER_ID);
const MODEL = process.env.AGENT_MODEL || undefined;
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

if (!TOKEN) { console.error("FATAL: falta TELEGRAM_BOT_TOKEN"); process.exit(1); }
if (!ALLOWED_ID) { console.error("FATAL: falta ALLOWED_TELEGRAM_USER_ID"); process.exit(1); }

// --- Sesiones por chat (sobreviven reinicios) ---
const SESSIONS_FILE = path.join(__dirname, "sessions.json");
const loadSessions = () => { try { return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf8")); } catch { return {}; } };
const saveSessions = (s) => fs.writeFileSync(SESSIONS_FILE, JSON.stringify(s, null, 2));
let sessions = loadSessions();

// --- Modo voz (toggle + voz) por chat ---
const VOICE_FILE = path.join(__dirname, "voice.json");
const VOICES = {
  alvaro: { id: "es-ES-AlvaroNeural", desc: "España, hombre" },
  elvira: { id: "es-ES-ElviraNeural", desc: "España, mujer" },
  ximena: { id: "es-ES-XimenaNeural", desc: "España, mujer (2)" },
};
const DEFAULT_ALIAS = "alvaro";
const loadVoice = () => { try { return JSON.parse(fs.readFileSync(VOICE_FILE, "utf8")); } catch { return {}; } };
let voiceState = loadVoice();
const saveVoice = () => fs.writeFileSync(VOICE_FILE, JSON.stringify(voiceState, null, 2));
const getVoice = (id) => voiceState[id] || { on: false, alias: DEFAULT_ALIAS };
const voiceOn = (id) => getVoice(id).on;
const voiceId = (id) => (VOICES[getVoice(id).alias] || VOICES[DEFAULT_ALIAS]).id;

async function textToVoiceOgg(text, voice) {
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const txt = path.join(os.tmpdir(), `tts_${stamp}.txt`);
  const mp3 = path.join(os.tmpdir(), `tts_${stamp}.mp3`);
  const ogg = path.join(os.tmpdir(), `tts_${stamp}.ogg`);
  const speak = text.length > 1500 ? text.slice(0, 1500) + " ... te dejo el resto por escrito." : text;
  fs.writeFileSync(txt, speak);
  try {
    await execFileP("edge-tts", ["--voice", voice || VOICES[DEFAULT_ALIAS].id, "--file", txt, "--write-media", mp3], { timeout: 60000 });
    await execFileP("ffmpeg", ["-y", "-i", mp3, "-c:a", "libopus", "-b:a", "32k", ogg], { timeout: 60000 });
    return fs.readFileSync(ogg);
  } finally {
    for (const f of [txt, mp3, ogg]) { try { fs.unlinkSync(f); } catch {} }
  }
}

// --- Puente al SDK de Claude (suscripción) ---
async function runAgent(chatId, content) {
  const resume = sessions[chatId];
  let sessionId = resume;
  let result = "";
  const promptArg = Array.isArray(content)
    ? (async function* () { yield { type: "user", message: { role: "user", content }, parent_tool_use_id: null }; })()
    : content;
  for await (const message of query({
    prompt: promptArg,
    options: {
      resume,
      model: MODEL,
      cwd: __dirname, // carga CLAUDE.md de esta carpeta como instrucciones
      permissionMode: "dontAsk",
      mcpServers: { aprendizajes: aprendizajesServer },
      allowedTools: ["ToolSearch", "WebSearch", "WebFetch", ...aprendizajesToolNames],
      disallowedTools: [
        "Bash", "Write", "Edit", "NotebookEdit",
        "mcp__claude_ai_Supabase__*", "mcp__claude_ai_Notion__*",
        "mcp__claude_ai_Canva__*", "mcp__claude_ai_Vercel__*",
        "mcp__hostinger-dns__*", "mcp__hostinger-domains__*",
      ],
    },
  })) {
    if (message.type === "system" && message.subtype === "init") sessionId = message.session_id;
    if (message.type === "result") result = message.result || "(sin respuesta)";
  }
  if (sessionId) { sessions[chatId] = sessionId; saveSessions(sessions); }
  return result || "(sin respuesta)";
}

function splitMessage(text, max = 4000) {
  const chunks = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut < max * 0.5) cut = max;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest.trim()) chunks.push(rest);
  return chunks;
}

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const loaderText = (f) => `${f} Pensando...`;

async function replyWithAgent(ctx, userText) {
  const placeholder = await ctx.reply(loaderText(SPINNER[0]));
  const msgId = placeholder.message_id;
  let i = 0;
  const anim = setInterval(() => {
    i = (i + 1) % SPINNER.length;
    ctx.api.editMessageText(ctx.chat.id, msgId, loaderText(SPINNER[i])).catch(() => {});
  }, 1500);
  try {
    const reply = await runAgent(ctx.chat.id, userText);
    clearInterval(anim);
    const chunks = splitMessage(reply);
    await ctx.api.editMessageText(ctx.chat.id, msgId, chunks[0] || "(sin respuesta)").catch(() => ctx.reply(chunks[0] || "(sin respuesta)"));
    for (let k = 1; k < chunks.length; k++) await ctx.reply(chunks[k]);
    if (voiceOn(ctx.chat.id) && reply && reply !== "(sin respuesta)") {
      try {
        await ctx.replyWithChatAction("record_voice").catch(() => {});
        const ogg = await textToVoiceOgg(reply, voiceId(ctx.chat.id));
        await ctx.replyWithVoice(new InputFile(ogg, "voz.ogg"));
      } catch (e) { console.error("tts error:", e); }
    }
  } catch (err) {
    clearInterval(anim);
    console.error("runAgent error:", err);
    const m = err?.message || String(err);
    const friendly = /authenticat|401|oauth|credential|unauthor/i.test(m)
      ? "🔑 Mi cerebro (Claude) necesita reautenticarse: ejecuta `claude setup-token` en el VPS y actualiza CLAUDE_CODE_OAUTH_TOKEN."
      : "Error procesando la respuesta: " + m;
    await ctx.api.editMessageText(ctx.chat.id, msgId, friendly).catch(() => ctx.reply(friendly));
  }
}

async function transcribeGroq(buf) {
  const fd = new FormData();
  fd.append("file", new Blob([buf]), "audio.ogg");
  fd.append("model", "whisper-large-v3");
  fd.append("language", "es");
  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST", headers: { Authorization: `Bearer ${GROQ_API_KEY}` }, body: fd,
  });
  if (!r.ok) throw new Error(`Groq ${r.status}`);
  const j = await r.json();
  return (j.text || "").trim();
}

const bot = new Bot(TOKEN);

bot.command("start", (ctx) => {
  if (ctx.from?.id !== ALLOWED_ID) return;
  ctx.reply("👋 Soy tu tutor de aprendizajes. Puedo enseñarte, guardar lo aprendido, ponerte un examen rápido y gestionar tus repasos.\n\nPrueba: \"enséñame qué es la entropía\", \"¿qué repaso hoy?\", \"examíname de física\".\n/reset para empezar de cero · /voz para audio.");
});
bot.command("reset", (ctx) => {
  if (ctx.from?.id !== ALLOWED_ID) return;
  delete sessions[ctx.chat.id]; saveSessions(sessions);
  ctx.reply("Conversación reiniciada.");
});
bot.command("voz", (ctx) => {
  if (ctx.from?.id !== ALLOWED_ID) return;
  const id = ctx.chat.id; const arg = String(ctx.match || "").trim().toLowerCase(); const st = getVoice(id);
  if (arg) {
    if (!VOICES[arg]) return ctx.reply(`No conozco "${arg}". Mira /voces.`);
    voiceState[id] = { on: true, alias: arg }; saveVoice();
    return ctx.reply(`🔊 Voz "${arg}" y modo voz ACTIVADO.`);
  }
  voiceState[id] = { on: !st.on, alias: st.alias }; saveVoice();
  ctx.reply(voiceState[id].on ? `🔊 Modo voz ACTIVADO (voz: ${st.alias}).` : "🔇 Modo voz desactivado.");
});
bot.command("voces", (ctx) => {
  if (ctx.from?.id !== ALLOWED_ID) return;
  const cur = getVoice(ctx.chat.id).alias;
  const lines = Object.entries(VOICES).map(([a, v]) => `${a === cur ? "▶️" : "•"} ${a} — ${v.desc}`).join("\n");
  ctx.reply(`Voces (cambia con /voz <nombre>):\n\n${lines}`);
});
bot.command("help", (ctx) => {
  if (ctx.from?.id !== ALLOWED_ID) return;
  ctx.reply("Tutor de aprendizajes por Telegram:\n- Aprender, guardar, repasar (SRS) y examinarte.\n- Texto, notas de voz e imágenes.\n\n/voz, /voces, /reset, /help");
});

bot.on("message:text", async (ctx) => {
  if (ctx.from?.id !== ALLOWED_ID) return ctx.reply("No autorizado.");
  if (ctx.message.text.startsWith("/")) return;
  await replyWithAgent(ctx, ctx.message.text);
});

bot.on(["message:voice", "message:audio"], async (ctx) => {
  if (ctx.from?.id !== ALLOWED_ID) return ctx.reply("No autorizado.");
  if (!GROQ_API_KEY) return ctx.reply("Falta GROQ_API_KEY para entender audios.");
  let transcript;
  try {
    await ctx.replyWithChatAction("typing").catch(() => {});
    const file = await ctx.getFile();
    const url = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
    const res = await fetch(url); if (!res.ok) throw new Error(`descarga ${res.status}`);
    transcript = await transcribeGroq(Buffer.from(await res.arrayBuffer()));
  } catch (err) { return ctx.reply("No pude transcribir: " + (err?.message || String(err))); }
  if (!transcript) return ctx.reply("No entendí el audio.");
  await ctx.reply(`🎤 "${transcript}"`).catch(() => {});
  await replyWithAgent(ctx, transcript);
});

bot.on("message:photo", async (ctx) => {
  if (ctx.from?.id !== ALLOWED_ID) return ctx.reply("No autorizado.");
  let content;
  try {
    await ctx.replyWithChatAction("typing").catch(() => {});
    const photos = ctx.message.photo;
    const file = await ctx.api.getFile(photos[photos.length - 1].file_id);
    const url = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
    const res = await fetch(url); if (!res.ok) throw new Error(`descarga ${res.status}`);
    const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    const caption = (ctx.message.caption || "").trim();
    content = [
      { type: "text", text: caption || "Mira esta imagen y dime qué es o qué aprendo de ella." },
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
    ];
  } catch (err) { return ctx.reply("No pude procesar la imagen: " + (err?.message || String(err))); }
  await replyWithAgent(ctx, content);
});

bot.catch((err) => console.error("Bot error:", err));

await bot.api.setMyCommands([
  { command: "help", description: "Qué puedo hacer" },
  { command: "voz", description: "Activar/desactivar respuestas por voz" },
  { command: "voces", description: "Ver y elegir la voz" },
  { command: "reset", description: "Empezar conversación de cero" },
  { command: "start", description: "Saludo e info" },
]).catch((e) => console.error("setMyCommands:", e));

console.log("Bot de aprendizajes arrancando (long polling)...");
bot.start();
