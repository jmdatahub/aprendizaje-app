# Agente de aprendizajes (VPS) — mismo patrón que el CRM

Dos cosas, ambas **sin coste de API** (Claude Agent SDK con la suscripción del
host, igual que tu asistente del CRM):

1. **Gestión por Telegram** — tu asistente general gana las herramientas de
   aprendizajes (aprender, guardar, repasar, examinarte, gestionar).
2. **App sin coste de API** — la web/móvil usa el VPS como motor de IA.

```
Telegram ─► asistente general (/opt/claude-telegram-agent, Agent SDK)
                 │  + aprendizajes.mjs (MCP in-process)
                 ▼  HTTPS + AGENT_TOKEN
App (Vercel) /api/agent ─► Supabase (learnings, hábitos, …)

App (Vercel) /api/chat,/api/test-me… ─► brain-server.mjs (Agent SDK) ─► Claude (suscripción)
                 ▲  HTTPS + BRAIN_TOKEN
```

## Archivos
| Archivo | Qué es |
|---|---|
| `aprendizajes.mjs` | MCP in-process con las 16 herramientas (llama a `/api/agent`). |
| `brain-server.mjs` | Servidor HTTP del cerebro para la app (Agent SDK). |
| `brain-server.service` | Unidad systemd del brain-server. |
| `INTEGRACION.md` | Cómo enchufar aprendizajes a tu asistente general (3 ediciones). |
| `SYSTEM_PROMPT.md` | Workflows/carácter (úsalo en el CLAUDE.md del asistente). |
| `install.sh` | Despliegue del brain-server. |

## Requisitos VPS
- Node ≥ 18 · Claude Agent SDK autenticado con la suscripción (`claude setup-token` → `CLAUDE_CODE_OAUTH_TOKEN`).
- Tu asistente del CRM ya cumple esto.

## A) Gestión por Telegram (recomendado)
Sigue **`INTEGRACION.md`**: copiar `aprendizajes.mjs`, añadir `APP_BASE_URL` +
`AGENT_TOKEN` al `.env` del asistente y hacer 3 ediciones en su `index.mjs`.
No requiere bot nuevo: reutiliza tu asistente general.

## B) App sin coste de API (brain-server)
```bash
# en el VPS
sudo mkdir -p /opt/aprendizaje-brain
sudo cp brain-server.mjs package.json /opt/aprendizaje-brain/
cd /opt/aprendizaje-brain
npm install
cp /ruta/agent/.env.example .env   # rellena BRAIN_TOKEN, BRAIN_MODEL, CLAUDE_CODE_OAUTH_TOKEN
sudo cp /ruta/agent/brain-server.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now brain-server
curl -s http://127.0.0.1:8788/health   # {"ok":true}
```
Luego **exponlo por HTTPS** (Vercel debe llegar). Con dominio propio + Caddy:
```
# /etc/caddy/Caddyfile
72-61-181-36.sslip.io {
    reverse_proxy localhost:8788
}
```
Y en **Vercel** añade `BRAIN_BASE_URL=https://72-61-181-36.sslip.io`, `BRAIN_TOKEN`,
`BRAIN_MODEL=sonnet` y redeploy. Si no pones `BRAIN_BASE_URL`, la app sigue con
OpenAI/stub como antes.

## Seguridad
- `AGENT_TOKEN` y `BRAIN_TOKEN` = acceso total: trátalos como contraseñas.
- El brain-server escucha solo en `127.0.0.1` (sálelo a internet vía proxy TLS).
- `permissionMode: dontAsk` + allowlist cerrada en el SDK (sin Bash/Write/Edit).
