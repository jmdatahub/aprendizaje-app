# Cómo enchufar "aprendizajes" a tu asistente general del CRM

Tu asistente del CRM vive en `/opt/claude-telegram-agent/` (servicio systemd
`claude-telegram-agent`, Claude Agent SDK + grammy, suscripción = sin API).
Para que el MISMO asistente gestione también los aprendizajes, solo hay que
añadirle la MCP `aprendizajes` (3 ediciones mínimas y aditivas).

## 1) Copiar la herramienta
```bash
cp aprendizajes.mjs /opt/claude-telegram-agent/aprendizajes.mjs
```

## 2) Añadir 2 variables al .env del asistente
```bash
# en /opt/claude-telegram-agent/.env
APP_BASE_URL=https://TU-APP-REAL.vercel.app
AGENT_TOKEN=el-mismo-AGENT_TOKEN-que-en-vercel
```

## 3) Tres ediciones en /opt/claude-telegram-agent/index.mjs
**a) import** (junto al import de crm.mjs):
```js
import { aprendizajesServer, aprendizajesToolNames } from "./aprendizajes.mjs";
```
**b) registrar la MCP** (en `options.mcpServers` del `query(...)`):
```js
mcpServers: { crm: crmServer, bot: botServer, aprendizajes: aprendizajesServer },
```
**c) permitir sus tools** (en `options.allowedTools`):
```js
allowedTools: ["ToolSearch", "WebSearch", "WebFetch", ...crmToolNames, ...botToolNames, ...aprendizajesToolNames],
```

## 4) Verificar y reiniciar
```bash
cd /opt/claude-telegram-agent
node --check index.mjs && node --check aprendizajes.mjs   # sintaxis OK
systemctl restart claude-telegram-agent
journalctl -u claude-telegram-agent -n 30 --no-pager       # arranque limpio
```

## 5) Probar por Telegram
Escribe a tu bot de siempre: *"¿qué tengo que repasar hoy?"*, *"guarda un
aprendizaje sobre la fotosíntesis en naturaleza"*, *"examíname de física"*.

> Requiere que la app esté desplegada en Vercel con `AGENT_TOKEN` configurado
> (mismo valor que el `.env`). Si no, las tools responderán con un error de API.

## Rollback (si algo va mal)
```bash
cp /opt/claude-telegram-agent/index.mjs.bak /opt/claude-telegram-agent/index.mjs
systemctl restart claude-telegram-agent
```
(Haz la copia `index.mjs.bak` ANTES de editar.)

## Alternativa: bot dedicado
Si prefieres un bot SOLO para aprendizajes (no mezclar con el CRM), clona el
patrón de `/opt/claude-telegram-agent/index.mjs` en un servicio nuevo que use
`aprendizajesServer`, con su propio `TELEGRAM_BOT_TOKEN` (otro bot de BotFather)
y `ALLOWED_TELEGRAM_USER_ID`.
