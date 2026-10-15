// Drives the real app (built into out/) and saves the raw screenshots and GIF frames that
// compose.py and gif.py turn into the itch.io page assets. Run on a 1920x1080 display, e.g.
//   Xvfb :98 -screen 0 1920x1080x24 &  DISPLAY=:98 node tools/marketing/capture.mjs /tmp/mni-shots
// PW points at the playwright package if it isn't resolvable from here.
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'

const {
  _electron: electron,
  chromium,
  devices
} = await import(
  process.env.PW ? pathToFileURL(path.join(process.env.PW, 'index.mjs')).href : 'playwright'
)
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const OUT = path.resolve(process.argv[2] ?? 'marketing-shots')
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'mni-demo-'))
const PROJ = path.join(WORK, 'PTA Movie Night')
fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true })
fs.mkdirSync(PROJ, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ELECTRON = path.join(
  ROOT,
  'node_modules/electron/dist',
  process.platform === 'win32' ? 'electron.exe' : 'electron'
)

async function launch() {
  const app = await electron.launch({
    executablePath: ELECTRON,
    args: ['--no-sandbox', path.join(ROOT, 'out/main/index.js')]
  })
  const page = await app.firstWindow()
  page.on('dialog', (d) => d.accept().catch(() => {}))
  await sleep(2000)
  return { app, page }
}
const resize = (app, w, h) =>
  app.evaluate(
    ({ BrowserWindow }, [w, h]) => BrowserWindow.getAllWindows()[0].setContentSize(w, h),
    [w, h]
  )
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) })

/** Records a few seconds of the window (Chrome's screencast: a frame whenever the picture
 * changes, with timestamps) for a GIF. */
async function record(page, name, seconds) {
  const dir = path.join(OUT, 'frames', name)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const cdp = await page.context().newCDPSession(page)
  const times = []
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = `${String(times.length).padStart(4, '0')}.jpg`
    fs.writeFileSync(path.join(dir, file), Buffer.from(data, 'base64'))
    times.push([file, metadata.timestamp])
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 90,
    maxWidth: 960,
    maxHeight: 540
  })
  await sleep(seconds * 1000)
  await cdp.send('Page.stopScreencast')
  await cdp.detach()
  fs.writeFileSync(path.join(dir, 'frames.json'), JSON.stringify(times))
}

// A classic film-leader countdown, recorded in the app's own Chromium, used as the demo
// "trailer" playing beside the slides.
async function makeLeader(page, file) {
  const b64 = await page.evaluate(async () => {
    const W = 1280,
      H = 720,
      SECONDS = 9
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d')
    const rec = new MediaRecorder(c.captureStream(30), { mimeType: 'video/webm' })
    const chunks = []
    rec.ondataavailable = (e) => chunks.push(e.data)
    const draw = (t) => {
      const n = 8 - Math.floor(t)
      const f = t % 1
      g.fillStyle = '#cdbf9f'
      g.fillRect(0, 0, W, H)
      g.fillStyle = 'rgba(40,30,20,0.55)'
      g.beginPath()
      g.moveTo(W / 2, H / 2)
      g.arc(W / 2, H / 2, 900, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2)
      g.fill()
      g.strokeStyle = '#2a2118'
      g.lineWidth = 6
      for (const r of [230, 290]) {
        g.beginPath()
        g.arc(W / 2, H / 2, r, 0, Math.PI * 2)
        g.stroke()
      }
      g.beginPath()
      g.moveTo(0, H / 2)
      g.lineTo(W, H / 2)
      g.moveTo(W / 2, 0)
      g.lineTo(W / 2, H)
      g.stroke()
      g.fillStyle = '#1b140d'
      g.font = 'bold 300px serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(String(Math.max(n, 2)), W / 2, H / 2 + 10)
      for (let i = 0; i < 900; i++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)'
        g.fillRect(Math.random() * W, Math.random() * H, 2, 2)
      }
      g.fillStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.08})`
      g.fillRect(0, 0, W, H)
    }
    rec.start()
    const t0 = performance.now()
    await new Promise((done) => {
      const tick = () => {
        const t = (performance.now() - t0) / 1000
        if (t >= SECONDS) return done()
        draw(Math.min(t, 6.99))
        requestAnimationFrame(tick)
      }
      tick()
    })
    rec.stop()
    await new Promise((r) => (rec.onstop = r))
    const blob = new Blob(chunks, { type: 'video/webm' })
    return await new Promise((r) => {
      const fr = new FileReader()
      fr.onload = () => r(String(fr.result).split(',')[1])
      fr.readAsDataURL(blob)
    })
  })
  fs.writeFileSync(file, Buffer.from(b64, 'base64'))
}

// ---- 1. Home, the New Show wizard, and the editor -------------------------------------
let { app, page } = await launch()
await resize(app, 1440, 810)
await sleep(500)
const leader = path.join(WORK, 'leader.webm')
await makeLeader(page, leader)
await shot(page, 'home')

await app.evaluate(({ dialog }, dir) => {
  dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] })
  dialog.showMessageBox = async () => ({ response: 0 })
}, PROJ)
await page.getByRole('button', { name: /New Show/ }).click()
await sleep(400)
await shot(page, 'wizard-themes')
await page.getByRole('button', { name: /PTA \/ school movie night/ }).click()
await page.getByPlaceholder('e.g. Hocus Pocus').fill('Space Pirates')
await page.locator('input[type=time]').fill('18:30')
await page.getByPlaceholder('e.g. Lincoln Elementary').fill('Lincoln Elementary')
await page.getByPlaceholder('https://…').fill('https://example.org/donate')
await page
  .locator('label.field', { hasText: 'Sponsors' })
  .locator('textarea')
  .fill("Joe's Pizza\nMain St. Dental\nBright Smiles Orthodontics\nCorner Books")
await sleep(300)
await shot(page, 'wizard-details')
await page.getByRole('button', { name: 'Next →' }).click()
await sleep(300)
await shot(page, 'wizard-sections')
await page.getByRole('button', { name: /Create my show/ }).click()
await sleep(2000)
await page
  .locator('.notice-banner button')
  .first()
  .click()
  .catch(() => {})
await page.locator('.item-card', { hasText: 'Concessions' }).click()
await sleep(1500)
await shot(page, 'editor-slides')
await page.locator('.item-card', { hasText: 'Movie Trivia' }).click()
await sleep(1500)
await shot(page, 'editor-trivia')
await app.close()

// ---- 2. Tweak the demo show: a "trailer" beside the welcome slides, showtime 25 min out
const pjPath = path.join(PROJ, 'project.json')
const pj = JSON.parse(fs.readFileSync(pjPath, 'utf8'))
fs.mkdirSync(path.join(PROJ, 'media/videos'), { recursive: true })
fs.copyFileSync(leader, path.join(PROJ, 'media/videos/trailer.webm'))
pj.library.videos.push({ fileName: 'trailer.webm', displayName: 'Trailer' })
const welcome = pj.items.find((i) => i.name === 'Welcome')
welcome.music = {
  kind: 'video',
  fileName: 'trailer.webm',
  displayName: 'Trailer',
  volume: 0,
  fadeInSec: 0.5,
  fadeOutSec: 0.5,
  layout: 'video-left',
  position: 'bottom-left',
  sizeScale: 3,
  loopSlidesUntilEnd: false
}
const trivia = pj.items.find((i) => i.type === 'trivia')
trivia.questionSec = 6
trivia.answerSec = 5
const soon = new Date(Date.now() + 25 * 60_000 + 30_000)
pj.countdown.targetTime = `${String(soon.getHours()).padStart(2, '0')}:${String(soon.getMinutes()).padStart(2, '0')}`
pj.countdown.style = 'ring'
pj.feature = {
  ...pj.feature,
  source: 'file',
  filePath: path.join(PROJ, 'media/videos/trailer.webm'),
  startMode: 'manual',
  transition: 'bumper'
}
for (const it of pj.items)
  if (it.type === 'slideshow') for (const f of it.frames) f.durationSec = Math.min(f.durationSec, 6)
fs.writeFileSync(pjPath, JSON.stringify(pj, null, 2))

// ---- 3. The show itself, at 1920x1080 ------------------------------------------------
;({ app, page } = await launch())
await app.evaluate(({ BrowserWindow }) => {
  const w = BrowserWindow.getAllWindows()[0]
  w.setPosition(0, 0)
  w.setContentSize(1920, 1080)
})
await app.evaluate(({ dialog }, f) => {
  dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [f] })
}, pjPath)
await page.getByRole('button', { name: 'Open Project' }).click()
await sleep(1500)

/** Starts the show on one playlist item (deterministic, unlike stepping through). */
async function startAt(name) {
  await page.locator('.item-card', { hasText: name }).first().click()
  await page.getByRole('button', { name: /Start From Selected/ }).click()
}
const stop = async () => {
  await page.keyboard.press('Escape')
  await sleep(1200)
}

await startAt('Welcome')
await sleep(2600)
await shot(page, 'show-welcome-video')
// Phone remote, while the show runs
const status = await page.evaluate(() => window.api.setRemoteEnabled(true))
const phoneBrowser = await chromium.launch()
const phone = await phoneBrowser.newPage({ ...devices['iPhone 13'] })
await phone.goto(`${status.urls[0]}/#pin=${status.pin}`)
await sleep(2000)
await phone.screenshot({ path: path.join(OUT, 'remote-phone.png') })
await phoneBrowser.close()
await record(page, 'slides', 8)
await stop()

for (const [item, name, wait] of [
  ['House Rules', 'show-house-rules', 2600],
  ['Concessions', 'show-concessions', 2600],
  ['Thank You', 'show-sponsors', 2600],
  ['Fundraiser', 'show-fundraiser', 2600],
  ['Coming Up', 'show-coming-up', 2600]
]) {
  await startAt(item)
  await sleep(wait)
  await shot(page, name)
  await stop()
}

await startAt('Movie Trivia')
await sleep(2500)
await shot(page, 'show-trivia-question')
await record(page, 'trivia', 6)
await sleep(800)
await shot(page, 'show-trivia-answer')
await stop()

// The feature group, then wrap up into the hold screen and the "Feature Presentation" intro
await startAt("Tonight's Feature")
await sleep(2600)
await shot(page, 'show-feature')
await page.keyboard.press('Enter')
await page.waitForSelector('.hold-panel', { timeout: 40000 }).catch(() => {})
await sleep(3000)
await shot(page, 'show-hold')
await page.keyboard.press('Enter')
await record(page, 'intro', 4.2)
await shot(page, 'show-intro')
await app.close().catch(() => {})
fs.rmSync(WORK, { recursive: true, force: true })
console.log('saved to', OUT)
