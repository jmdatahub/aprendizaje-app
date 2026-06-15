// Mobile audit screenshot script (Playwright).
// Run: node scripts/mobile-audit.mjs
// Captures every primary route + every important modal at 320 / 375 / 430 viewports.
// Saves PNGs into screenshots/mobile-audit/.

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const OUT = path.resolve('screenshots/mobile-audit')

// Realistic mobile devices we want to validate
const VIEWPORTS = [
  { name: '320', width: 320, height: 568, label: 'iphone-se' },
  { name: '375', width: 375, height: 812, label: 'iphone-12' },
  { name: '430', width: 430, height: 932, label: 'iphone-15-pro-max' },
]

// Routes to capture as-is
const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/mapa', name: 'mapa' },
  { path: '/aprendizajes', name: 'aprendizajes' },
  { path: '/habilidades', name: 'habilidades' },
  { path: '/rutas', name: 'rutas' },
  { path: '/progreso', name: 'progreso' },
  { path: '/juegos-matematicos', name: 'juegos' },
  { path: '/focus-timer', name: 'focus-timer' },
  { path: '/aprender', name: 'aprender' },
  { path: '/repaso/historial', name: 'repaso-historial' },
  { path: '/login', name: 'login' },
]

// Interactive flows we want to capture (modal opens, sidebars open, etc.)
const FLOWS = [
  {
    name: 'home-settings-open',
    path: '/',
    action: async (page) => {
      const btn = page.locator('button[aria-label*="Ajust" i], button[aria-label*="Config" i]').first()
      await btn.click()
      await page.waitForTimeout(500)
    },
  },
  {
    name: 'mapa-unlock-modal',
    path: '/mapa',
    action: async (page) => {
      const card = page.locator('div[aria-label^="Desbloquear"], div:has(> svg + div + h3)').first()
      // Fallback: click any locked sector card text "TOCAR PARA DESBLOQUEAR"
      const lockedText = page.getByText(/TOCAR PARA DESBLOQUEAR/i).first()
      if (await lockedText.count()) {
        await lockedText.click({ force: true })
      } else if (await card.count()) {
        await card.click({ force: true })
      }
      await page.waitForTimeout(700)
    },
  },
  {
    name: 'habilidades-new-modal',
    path: '/habilidades',
    action: async (page) => {
      const btn = page.getByRole('button', { name: /Nueva habilidad|primera habilidad/i }).first()
      await btn.click()
      await page.waitForTimeout(700)
    },
  },
  {
    name: 'aprender-sidebar-open',
    path: '/aprender',
    action: async (page) => {
      // Wait for chat header to render
      await page.waitForSelector('header.md\\:hidden', { timeout: 8000 }).catch(() => {})
      // Click the hamburger button by exact aria-label (open state)
      const btn = page.getByRole('button', { name: /Abrir conversaciones/i })
      await btn.click({ timeout: 5000 })
      await page.waitForTimeout(800)
    },
  },
  {
    name: 'aprender-menu-open',
    path: '/aprender',
    action: async (page) => {
      const btn = page.locator('button[aria-label*="Más opciones" i]').first()
      await btn.click()
      await page.waitForTimeout(500)
    },
  },
  {
    name: 'aprender-detail-level-open',
    path: '/aprender',
    action: async (page) => {
      // Just hover/click on detail level to show tooltip if possible
      const lvl = page.locator('button[aria-label*="Detallado" i]').first()
      if (await lvl.count()) {
        await lvl.click()
        await page.waitForTimeout(400)
      }
    },
  },
]

async function captureViewport(browser, vp) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    colorScheme: 'light',
  })
  const page = await ctx.newPage()
  page.setDefaultTimeout(15000)

  for (const route of ROUTES) {
    const url = `${BASE}${route.path}`
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => page.goto(url, { timeout: 15000 }))
    } catch {}
    await page.waitForTimeout(1500)
    // Pause infinite CSS animations BEFORE screenshot to avoid the 30s timeouts.
    await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s !important;animation-iteration-count:1 !important;}' })
    const file = path.join(OUT, `${vp.name}_${route.name}.png`)
    try {
      await page.screenshot({ path: file, fullPage: true, animations: 'disabled' })
      console.log(`[${vp.name}] ${route.name} → ${file}`)
    } catch (e) {
      console.error(`screenshot fail ${vp.name}/${route.name}:`, e.message)
    }
  }

  // Flows: navigate, run action, capture
  for (const flow of FLOWS) {
    try {
      await page.goto(`${BASE}${flow.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await page.waitForTimeout(1500)
      await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s !important;animation-iteration-count:1 !important;}' })
      await flow.action(page)
      await page.waitForTimeout(400)
      await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s !important;animation-iteration-count:1 !important;}' })
      const file = path.join(OUT, `${vp.name}_${flow.name}.png`)
      await page.screenshot({ path: file, fullPage: true, animations: 'disabled' })
      console.log(`[${vp.name}] ${flow.name} → ${file}`)
    } catch (e) {
      console.error(`flow fail ${vp.name}/${flow.name}:`, e.message)
    }
  }

  await ctx.close()
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  for (const vp of VIEWPORTS) {
    console.log(`\n=== Viewport ${vp.name} (${vp.width}×${vp.height}) ===`)
    await captureViewport(browser, vp)
  }
  await browser.close()
  console.log('\nDone. PNGs at', OUT)
}

main().catch(err => { console.error(err); process.exit(1) })
