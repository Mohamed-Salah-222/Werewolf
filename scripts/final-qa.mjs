import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'

const REPO = path.resolve(import.meta.dirname, '..')
const FE = path.join(REPO, 'Front-End')
const BE = path.join(REPO, 'Back-End')
const PORT = 5199
const BASE = `http://localhost:${PORT}`
const OUT = path.join(REPO, 'screenshots')
mkdirSync(OUT, { recursive: true })

const exeCandidates = ['/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/brave']
const executablePath = exeCandidates.find((p) => existsSync(p))
if (!executablePath) { console.error('no chromium'); process.exit(1) }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitFor(proc, needle, label, ms = 60000) {
  const t0 = Date.now()
  return new Promise((resolve, reject) => {
    let buf = ''
    const onData = (d) => {
      buf += d.toString()
      process.stdout.write(d.toString())
      if (buf.includes(needle)) resolve()
      else if (Date.now() - t0 > ms) reject(new Error(`timeout waiting ${label}`))
    }
    proc.stdout.on('data', onData)
    proc.stderr.on('data', onData)
    proc.on('exit', (c) => reject(new Error(`${label} exited (${c})`)))
  })
}

function start(cmd, args, cwd, label) {
  const p = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
  p.label = label
  return p
}

const be = start('npx', ['nodemon'], BE, 'backend')
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch('http://localhost:3000/health')
    if (r.ok) break
  } catch {}
  await sleep(1000)
  if (i === 59) { console.error('BE_FAIL: health never ok'); process.exit(1) }
}
console.log('BE_READY')

const fe = start('npx', ['vite', '--port', String(PORT), '--strictPort'], FE, 'vite')
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(BASE)
    if (r.ok) break
  } catch {}
  await sleep(1000)
  if (i === 59) { console.error('FE_FAIL: vite never up'); process.exit(1) }
}
console.log('FE_READY')

async function shot(page, name) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await sleep(400)
  await page.screenshot({ path: path.join(OUT, name), fullPage: false })
  console.log('SHOT', name)
}

function ctx(browser, viewport) {
  return browser.newContext({ viewport, locale: 'ar-EG' })
}

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] })

try {
  // ── HOST ──
  const host = await ctx(browser, { width: 1440, height: 900 })
  const hp = await host.newPage()
  await hp.goto(BASE + '/')
  await shot(hp, 'p10-home-desktop.png')

  await hp.getByText('اعمل لعبة').click()
  await hp.getByPlaceholder('اكتب اسمك').fill('أم علي')
  await hp.locator('.home-confirm-btn').click()
  await hp.waitForURL(/\/waiting\//, { timeout: 20000 })
  const code = hp.url().split('/waiting/')[1]
  console.log('GAME CODE', code)
  if (!code || code.length !== 6) throw new Error('bad code')

  // ── JOINERS ──
  const names = ['حسن', 'نجوى', 'عبده', 'سميحة', 'شعبان']
  const joiners = []
  for (let i = 0; i < names.length; i++) {
    const mobile = i === 4
    const c = await ctx(browser, mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 })
    await c.addInitScript(([n]) => sessionStorage.setItem('werewolf_playerName', n), [names[i]])
    const pg = await c.newPage()
    await pg.goto(`${BASE}/join/${code}`)
    await pg.waitForURL(/\/waiting\//, { timeout: 20000 })
    await pg.locator('.wr-ready-btn').click()
    joiners.push({ c, pg, mobile })
    await sleep(300)
  }

  // ── WAITING ROOM SHOTS ──
  await sleep(1200)
  await shot(hp, 'p10-waiting-desktop.png')
  await shot(joiners[4].pg, 'p10-waiting-mobile.png')

  // ── START ──
  await hp.locator('.wr-ready-btn').click()
  await sleep(500)
  const startBtn = hp.locator('.wr-start-btn, button', { hasText: 'ابدأ اللعبة' }).first()
  await startBtn.click({ timeout: 15000 }).catch(() => hp.getByText('ابدأ اللعبة').first().click())
  await hp.waitForURL(/\/role-reveal\//, { timeout: 20000 })

  // ── ROLE REVEAL ──
  await sleep(800)
  const confirmBtn = hp.locator('.rr-confirm-btn')
  if (!(await confirmBtn.isVisible().catch(() => false))) {
    await hp.locator('.rr-card-container--clickable').click()
    await sleep(700)
  }
  await shot(hp, 'p10-role-reveal-desktop.png')
  await confirmBtn.click()

  for (const j of joiners) {
    try {
      await j.pg.waitForURL(/\/role-reveal\//, { timeout: 15000 })
      const jConfirm = j.pg.locator('.rr-confirm-btn')
      if (!(await jConfirm.isVisible().catch(() => false))) {
        await j.pg.locator('.rr-card-container--clickable').click({ timeout: 8000 })
        await sleep(400)
      }
      await jConfirm.click({ timeout: 8000 })
    } catch { console.log('joiner skipped reveal (already advanced)') }
  }

  // ── NIGHT ──
  await hp.waitForURL(/\/night\//, { timeout: 60000 })
  await sleep(1500)
  await shot(hp, 'p10-night-desktop.png')
  await shot(joiners[4].pg, 'p10-night-mobile.png')

  // ── DISCUSSION ──
  await hp.waitForURL(/\/discussion\//, { timeout: 360000 })
  await sleep(1500)
  await shot(hp, 'p10-discussion-desktop.png')
  await hp.locator('.disc-skip-btn').click()

  // ── VOTE ──
  await hp.waitForURL(/\/vote\//, { timeout: 120000 })
  await sleep(1500)
  await shot(hp, 'p10-vote-desktop.png')

  // host votes "no werewolf"
  await hp.locator('.vote-item.vote-no-wolf').click({ timeout: 10000 })
  await hp.locator('.vote-btn').click({ timeout: 10000 })

  for (const j of joiners) {
    try {
      await j.pg.waitForURL(/\/vote\//, { timeout: 15000 })
      await j.pg.locator('.vote-item').first().click({ timeout: 8000 })
      await j.pg.locator('.vote-btn').click({ timeout: 8000 })
    } catch { console.log('joiner skipped voting') }
  }
  await sleep(1500)
  // force any stragglers (button lives in the host's waiting view)
  const forceBtn = hp.locator('.vote-force-btn')
  if (await forceBtn.isVisible().catch(() => false)) {
    await forceBtn.click()
    await hp.locator('.vote-force-modal-yes').click({ timeout: 5000 }).catch(() => {})
  }

  // ── RESULTS ──
  await hp.waitForURL(/\/results\//, { timeout: 120000 })
  await sleep(2500)
  await shot(hp, 'p10-results-desktop.png')

  console.log('QA_PASS')
} catch (e) {
  console.error('QA_FAIL:', e.message)
  process.exitCode = 1
} finally {
  await browser.close()
  fe.kill('SIGTERM'); be.kill('SIGTERM')
}
