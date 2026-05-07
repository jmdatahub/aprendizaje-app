#!/usr/bin/env bash
# ============================================================
# deploy-secure.sh — push security secrets to Vercel + reset
# Telegram webhook with the new secret. Run once.
#
# Usage:
#   bash scripts/deploy-secure.sh
#
# What it does (in order):
#   1) Reads secrets from .env.local
#   2) Logs you into Vercel (browser popup, ~30 seconds)
#   3) Links this repo to your Vercel project (one prompt)
#   4) Pushes the 4 security env vars to Vercel (production)
#   5) Asks for your TELEGRAM_BOT_TOKEN once (echo off)
#   6) Reads your real production hostname from Vercel
#   7) Updates TELEGRAM_WEBHOOK_HOST locally + on Vercel
#   8) Calls Telegram setWebhook with the new secret
#   9) Triggers a Vercel deploy so the new env vars take effect
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

# --- Step 0: prereqs ---
command -v node >/dev/null || { echo "node required"; exit 1; }
command -v curl >/dev/null || { echo "curl required"; exit 1; }
[ -f .env.local ] || { echo ".env.local missing"; exit 1; }

# --- Step 1: read secrets from .env.local ---
TELEGRAM_WEBHOOK_SECRET=$(grep -E '^TELEGRAM_WEBHOOK_SECRET=' .env.local | cut -d= -f2-)
ADMIN_TOKEN=$(grep -E '^ADMIN_TOKEN=' .env.local | cut -d= -f2-)
CRON_SECRET=$(grep -E '^CRON_SECRET=' .env.local | cut -d= -f2-)

if [ -z "$TELEGRAM_WEBHOOK_SECRET" ] || [ -z "$ADMIN_TOKEN" ] || [ -z "$CRON_SECRET" ]; then
  echo "Missing one of the security secrets in .env.local — aborting."
  exit 1
fi

echo "✓ Found secrets in .env.local"

# --- Step 2 + 3: login + link ---
echo ""
echo "→ Logging into Vercel (browser opens)..."
npx --yes vercel login || true
echo "→ Linking repo to your Vercel project..."
npx --yes vercel link --yes || npx --yes vercel link

# --- Step 4: push env vars to Vercel ---
push_env() {
  local key="$1"
  local val="$2"
  # Remove any existing value first (ignore errors), then set fresh
  printf '%s' "$val" | npx --yes vercel env rm  "$key" production --yes 2>/dev/null || true
  printf '%s' "$val" | npx --yes vercel env add "$key" production
}

echo ""
echo "→ Pushing security env vars to Vercel (production)..."
push_env TELEGRAM_WEBHOOK_SECRET "$TELEGRAM_WEBHOOK_SECRET"
push_env ADMIN_TOKEN             "$ADMIN_TOKEN"
push_env CRON_SECRET             "$CRON_SECRET"

# --- Step 5: bot token ---
echo ""
echo "→ Need your TELEGRAM_BOT_TOKEN (won't be saved in history)."
read -srp "  Bot token: " TG_BOT_TOKEN
echo ""

# --- Step 6: detect production hostname ---
PROD_HOST=$(npx --yes vercel inspect --prod 2>/dev/null | grep -oE 'https://[^ ]+\.vercel\.app' | head -1 | sed 's|https://||')
if [ -z "$PROD_HOST" ]; then
  read -rp "  Could not auto-detect prod URL. Enter your hostname (e.g. aprendizaje-app.vercel.app): " PROD_HOST
fi
echo "  Production host: $PROD_HOST"

# --- Step 7: update host locally + on Vercel ---
push_env TELEGRAM_WEBHOOK_HOST "$PROD_HOST"
sed -i.bak "s|^TELEGRAM_WEBHOOK_HOST=.*$|TELEGRAM_WEBHOOK_HOST=$PROD_HOST|" .env.local

# --- Step 8: setWebhook ---
echo ""
echo "→ Resetting Telegram webhook with new secret..."
RESULT=$(curl -sS -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://${PROD_HOST}/api/notify/telegram/webhook\",\"secret_token\":\"${TELEGRAM_WEBHOOK_SECRET}\"}")
echo "$RESULT" | node -e "let s=''; process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s); console.log(j.ok ? '  ✓ Webhook configured' : '  ✗ Telegram error: '+(j.description||s));}catch{console.log('  raw: '+s)}})"

# --- Step 9: deploy ---
echo ""
echo "→ Triggering production deploy so new env vars take effect..."
npx --yes vercel deploy --prod

echo ""
echo "════════════════════════════════════════════════"
echo "  ✓ Done. Your app is now hardened in production."
echo "════════════════════════════════════════════════"
