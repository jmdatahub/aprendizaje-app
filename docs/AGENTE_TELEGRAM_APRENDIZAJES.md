# Sistema de aprendizajes por Telegram + IA sin coste de API — Plan

> Doble objetivo, ambos **sin API de pago** (el cerebro es tu Claude del VPS vía
> suscripción, igual que el asistente del CRM):
> 1. **Gestionar todo el sistema de aprendizajes desde Telegram** (aprender,
>    guardar, repasar, examinarte, gestionar).
> 2. **Quitar el coste de API de la app** usando el VPS como motor de IA.

---

## 1. Realidad descubierta de tu infra (revisado por SSH)

Tu asistente del CRM en el VPS (`72.61.181.36`, Ubuntu 24.04):
- `/opt/claude-telegram-agent/` · servicio systemd `claude-telegram-agent`.
- **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) + **grammy** (Telegram) +
  **Groq** (voz). Auth con `CLAUDE_CODE_OAUTH_TOKEN` = **suscripción, sin API**. ✅
- Tools in-process vía `createSdkMcpServer`/`tool()` (`crm.mjs`), `permissionMode:
  "dontAsk"` con allowlist cerrada.
- NO usa el CLI `claude` ni pm2. (Por eso el primer borrador basado en CLI se ha
  descartado y reescrito al patrón SDK.)

Puntos a confirmar contigo (no los sé desde aquí):
- **URL real de producción** de la app (el `.env.local` tiene un placeholder).
- La app usa Supabase `shqkwxribvuktcxtuujr` (en **otra cuenta** que mi MCP no ve);
  el proyecto `oumnkxwpqppysncdwyhu` que reactivé NO es ese (era un duplicado).

---

## 2. Arquitectura

```
Telegram ─► asistente general (Agent SDK, suscripción)
                 │  + aprendizajes.mjs (MCP in-process)
                 ▼  HTTPS + AGENT_TOKEN
App (Vercel) /api/agent ─► Supabase (learnings, hábitos, recordatorios…)

App (Vercel) /api/chat,/api/test-me,… ─► brain-server.mjs (Agent SDK) ─► Claude (suscripción)
                 ▲  HTTPS + BRAIN_TOKEN
```

## 3. Ejecutado (verificado: tsc/eslint/`node --check`/endpoint en caliente)

### App (Vercel)
- `lib/agent/tools.ts` — 16 herramientas sobre `learnings` + SRS real (incl.
  `get_learnings_for_quiz`).
- `app/api/agent/route.ts` — endpoint seguro (GET catálogo / POST `{tool,args}`,
  `Bearer AGENT_TOKEN`, rate-limit). Probado: 401 sin token, 16 tools con token.
- `lib/brain.ts` + `lib/openai.ts` (router de proveedor) — la app usa el cerebro
  del VPS si `BRAIN_BASE_URL`+`BRAIN_TOKEN` están en Vercel; si no, OpenAI/stub.
  Las ~9 rutas de IA quedan sin coste **sin tocarlas**.
- Fix: `telegram/setup` ahora envía `secret_token`.

### VPS (`agent/`)
- `aprendizajes.mjs` — MCP in-process (calca `crm.mjs`) que llama a `/api/agent`.
- `brain-server.mjs` (+ `brain-server.service`) — cerebro de la app (Agent SDK).
- `INTEGRACION.md` — enchufar aprendizajes al asistente general (3 ediciones).
- `SYSTEM_PROMPT.md` — workflows (aprender adaptativo, guardar, repaso, examen,
  gestión). `install.sh`, `README.md`, `.env.example`.

## 4. Workflows
Aprender (tutor adaptativo) · Guardar · Repaso SRS · Examen/test · Progreso ·
Gestión (buscar/editar/borrar, recordatorios, hábitos). Detalle: `SYSTEM_PROMPT.md`.

---

## 5. Despliegue paso a paso

### A) Gestión por Telegram
1. Copiar `agent/aprendizajes.mjs` a `/opt/claude-telegram-agent/`.
2. Añadir `APP_BASE_URL` + `AGENT_TOKEN` a su `.env`.
3. Tres ediciones en su `index.mjs` (import + `mcpServers` + `allowedTools`).
4. `node --check` + `systemctl restart claude-telegram-agent` + ver logs.
   (Todo detallado en `agent/INTEGRACION.md`, con rollback.)

### B) App sin coste de API
1. `agent/install.sh` → despliega `brain-server` (systemd) en `/opt/aprendizaje-brain`.
2. Exponerlo por HTTPS (Caddy con un subdominio, p.ej. `brain.soulia.info`).
3. En Vercel: `BRAIN_BASE_URL`, `BRAIN_TOKEN`, `BRAIN_MODEL=sonnet` + redeploy.

---

## 6. TUS dependencias (lo que solo puedes hacer tú)
- [ ] **Vercel**: poner `AGENT_TOKEN` (y para B: `BRAIN_TOKEN`, `BRAIN_BASE_URL`,
      `BRAIN_MODEL`) + **desplegar** la rama con el código nuevo. *(El MCP de
      Vercel no permite escribir env vars ni accede a tu proyecto.)*
- [ ] Confirmar la **URL de producción** de la app.
- [ ] Confirmar que la **Supabase real** (`shqkwxribvuktcxtuujr`) está activa.
- [ ] Decidir el **subdominio del cerebro** (para B) — puedo crear el DNS en
      Hostinger y montar Caddy yo.

## 7. Tokens generados (trátalos como contraseñas)
```
AGENT_TOKEN=e4f641511d6721ec3eca0c1ed7cabd8c13e7652b46117efcf49d6ef889ee6adf
BRAIN_TOKEN=0575209f66dbf624fd6797c5a437693037cf735adf986dae78aab850eb1d8345
```

## 8. Lo que puedo hacer yo (con tu OK)
Tengo SSH al VPS (clave `claude_telegram_vps`) y MCP de Supabase/Hostinger:
enchufar aprendizajes al asistente (con backup+rollback), desplegar el
brain-server, crear el DNS `brain.*` y montar Caddy. Solo me falta tu paso de
Vercel y confirmar la URL/Supabase reales.
