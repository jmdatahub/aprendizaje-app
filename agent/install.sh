#!/usr/bin/env bash
# Despliega el brain-server (IA para la app, sin coste de API) en el VPS.
# Para la gestión por Telegram, sigue INTEGRACION.md (no necesita este script).
#
# Uso:  bash install.sh
set -euo pipefail
cd "$(dirname "$0")"

DEST=/opt/aprendizaje-brain

echo "==> Requisitos"
command -v node >/dev/null || { echo "Falta Node >= 18"; exit 1; }

echo "==> Copiando a $DEST"
sudo mkdir -p "$DEST"
sudo cp brain-server.mjs package.json "$DEST"/

echo "==> Instalando dependencias"
( cd "$DEST" && sudo npm install --omit=dev )

if [ ! -f "$DEST/.env" ]; then
  echo "==> Creando $DEST/.env (EDÍTALO: BRAIN_TOKEN, BRAIN_MODEL, CLAUDE_CODE_OAUTH_TOKEN)"
  sudo cp .env.example "$DEST/.env"
  echo "✋ Edita $DEST/.env y vuelve a ejecutar."
  exit 0
fi

echo "==> Instalando servicio systemd"
sudo cp brain-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now brain-server

sleep 2
echo "==> Health check"
curl -s http://127.0.0.1:8788/health || echo "(sin respuesta — revisa: journalctl -u brain-server -n 30)"
echo ""
echo "✅ brain-server desplegado. Falta exponerlo por HTTPS (Caddy/túnel) y poner"
echo "   BRAIN_BASE_URL + BRAIN_TOKEN + BRAIN_MODEL en Vercel (ver README.md)."
