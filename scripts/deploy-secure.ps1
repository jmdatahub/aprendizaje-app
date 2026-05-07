# ============================================================
# deploy-secure.ps1 — push security secrets to Vercel + reset
# Telegram webhook with the new secret. Run once.
#
# Usage (from project root):
#   powershell -ExecutionPolicy Bypass -File .\scripts\deploy-secure.ps1
# ============================================================
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

# --- Step 1: read secrets from .env.local ---
if (-not (Test-Path ".env.local")) { throw ".env.local missing" }
$envContent = Get-Content .env.local

function Get-EnvVal($key) {
    ($envContent | Where-Object { $_ -match "^$key=" } | Select-Object -First 1) -replace "^$key=", ""
}

$TG_SECRET   = Get-EnvVal "TELEGRAM_WEBHOOK_SECRET"
$ADMIN_TOK   = Get-EnvVal "ADMIN_TOKEN"
$CRON_SEC    = Get-EnvVal "CRON_SECRET"

if (-not $TG_SECRET -or -not $ADMIN_TOK -or -not $CRON_SEC) {
    throw "Missing one of the security secrets in .env.local"
}
Write-Host "OK Found secrets in .env.local" -ForegroundColor Green

# --- Step 2-3: login + link ---
Write-Host "`n-> Logging into Vercel (browser will open)..." -ForegroundColor Cyan
npx --yes vercel login
Write-Host "-> Linking repo to your Vercel project..." -ForegroundColor Cyan
npx --yes vercel link

# --- Step 4: push env vars ---
function Push-Env($key, $val) {
    Write-Host "  setting $key..." -ForegroundColor Gray
    # remove any existing value (ignore errors)
    $val | npx --yes vercel env rm $key production --yes 2>$null | Out-Null
    $val | npx --yes vercel env add $key production
}

Write-Host "`n-> Pushing security env vars to Vercel (production)..." -ForegroundColor Cyan
Push-Env "TELEGRAM_WEBHOOK_SECRET" $TG_SECRET
Push-Env "ADMIN_TOKEN"             $ADMIN_TOK
Push-Env "CRON_SECRET"             $CRON_SEC

# --- Step 5: bot token ---
Write-Host "`n-> Need your TELEGRAM_BOT_TOKEN (won't be saved in history)." -ForegroundColor Cyan
$secureToken = Read-Host "  Bot token" -AsSecureString
$BotToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken))

# --- Step 6: detect production hostname ---
$inspect = (npx --yes vercel inspect --prod 2>$null) -join "`n"
$ProdHost = ($inspect | Select-String -Pattern 'https://[^\s]+\.vercel\.app' | ForEach-Object { $_.Matches[0].Value }) | Select-Object -First 1
if ($ProdHost) { $ProdHost = $ProdHost -replace 'https://', '' }
if (-not $ProdHost) {
    $ProdHost = Read-Host "  Could not auto-detect prod URL. Enter hostname (e.g. aprendizaje-app.vercel.app)"
}
Write-Host "  Production host: $ProdHost" -ForegroundColor Green

# --- Step 7: update host ---
Push-Env "TELEGRAM_WEBHOOK_HOST" $ProdHost
$envContent = $envContent | ForEach-Object {
    if ($_ -match "^TELEGRAM_WEBHOOK_HOST=") { "TELEGRAM_WEBHOOK_HOST=$ProdHost" } else { $_ }
}
$envContent | Set-Content .env.local -Encoding utf8

# --- Step 8: setWebhook ---
Write-Host "`n-> Resetting Telegram webhook with new secret..." -ForegroundColor Cyan
$body = @{
    url          = "https://$ProdHost/api/notify/telegram/webhook"
    secret_token = $TG_SECRET
} | ConvertTo-Json -Compress

$response = Invoke-RestMethod -Method Post `
    -Uri "https://api.telegram.org/bot$BotToken/setWebhook" `
    -ContentType "application/json" -Body $body
if ($response.ok) {
    Write-Host "  OK Webhook configured" -ForegroundColor Green
} else {
    Write-Host "  FAIL Telegram error: $($response.description)" -ForegroundColor Red
}

# --- Step 9: deploy ---
Write-Host "`n-> Triggering production deploy so new env vars take effect..." -ForegroundColor Cyan
npx --yes vercel deploy --prod

Write-Host "`n================================================" -ForegroundColor Green
Write-Host "  OK Done. Your app is now hardened in production." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
