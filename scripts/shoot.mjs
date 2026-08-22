import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { existsSync } from 'node:fs'
import path from 'node:path'

const REPO = path.resolve(import.meta.dirname, '..')
const FE = path.join(REPO, 'Front-End')
const PORT = 5199
const BASE = `http://localhost:${PORT}`

const raw = process.argv.slice(2)
const outDir = path.join(REPO, 'screenshots')
mkdirSync(outDir, { recursive: true })

let mobileOnly = false
let desktopOnly = false
const shots = []
for (const a of raw) {
  if (a === '--mobile-only') { mobileOnly = true; continue }
  if (a === '--desktop-only') { desktopOnly = true; continue }
  const eq = a.indexOf('=')
  const name = eq === -1 ? a : a.slice(0, eq)
  const route = eq === -1 ? '/' : a.slice(eq + 1)
  shots.push({ name, route })
}
if (!shots.length) shots.push({ name: 'home', route: '/' })

const exeCandidates = [
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/brave',
  `${process.env.HOME}/.local/bin/google-chrome`,
]
const executablePath = exeCandidates.find((p) => existsSync(p))
if (!executablePath) {
  console.error('SHOOT_FAIL: no chromium/chrome binary found')
  process.exit(1)
}

function startVite() {
  const proc = spawn('npm', ['run', 'dev', '--', '--port', String(PORT), '--strictPort'], {
    cwd: FE,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let buf = ''
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('vite dev timed out')), 90000)
    const onData = (d) => {
      buf += d.toString()
      if (buf.includes('Local:') || buf.includes(`localhost:${PORT}`)) {
        clearTimeout(t)
        resolve(proc)
      }
    }
    proc.stdout.on('data', onData)
    proc.stderr.on('data', onData)
    proc.on('exit', (code) => reject(new Error(`vite exited early (${code}): ${buf.slice(-500)}`)))
  })
}

let vite
try {
  vite = await startVite()
} catch (e) {
  console.error('SHOOT_FAIL:', e.message)
  process.exit(1)
}

const browser = await chromium.launch({
  executablePath,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

const viewports = []
if (!desktopOnly) viewports.push({ tag: 'mobile', width: 390, height: 844 })
if (!mobileOnly) viewports.push({ tag: 'desktop', width: 1440, height: 900 })

let failed = false
try {
  for (const vp of viewports) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      locale: 'ar-EG',
    })
    const page = await ctx.newPage()
    for (const s of shots) {
      try {
        await page.goto(`${BASE}${s.route}`, { waitUntil: 'networkidle', timeout: 30000 })
        await page.waitForTimeout(1500)
        const file = path.join(outDir, `${s.name}-${vp.tag}.png`)
        await page.screenshot({ path: file, fullPage: true })
        console.log(`SHOT_OK ${file}`)
      } catch (e) {
        failed = true
        console.error(`SHOT_FAIL ${s.name}@${vp.tag}: ${e.message}`)
      }
    }
    await ctx.close()
  }
} finally {
  await browser.close()
  vite.kill('SIGTERM')
  setTimeout(() => vite.kill('SIGKILL'), 3000)
}

process.exit(failed ? 1 : 0)
