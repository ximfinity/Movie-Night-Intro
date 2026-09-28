import { app, BrowserWindow, ipcMain } from 'electron'
import http from 'http'
import os from 'os'
import crypto from 'crypto'
import { join } from 'path'
import fs from 'fs/promises'
import {
  IDLE_REMOTE_STATE,
  isRemoteCommand,
  type RemoteServerStatus,
  type RemoteState
} from '../shared/remote'
import remotePage from './remotePage.html?raw'
import logoSvg from '../renderer/src/assets/logo.svg?raw'

/** Phone remote: a small web server on the PC that a phone on the same Wi-Fi opens in its
 * browser. A 4-digit PIN (shown in the editor) gets a phone a token it keeps; tokens stay
 * valid across restarts until the PIN is changed. */

interface RemoteSettings {
  enabled: boolean
  port: number
  pin: string
  tokens: string[]
}

const DEFAULT_PORT = 8765
const PORT_ATTEMPTS = 10
const MAX_TOKENS = 20
const MAX_BODY_BYTES = 4096
const MAX_FAILURES = 5
const LOCKOUT_MS = 60_000

function newPin(): string {
  return String(crypto.randomInt(0, 10_000)).padStart(4, '0')
}

function settingsFile(): string {
  return join(app.getPath('userData'), 'remote.json')
}

function sameSecret(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb)
}

/** http://address:port for each IPv4 network the PC is on, likeliest first. */
function lanUrls(port: number): string[] {
  const addresses: string[] = []
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        addresses.push(net.address)
      }
    }
  }
  const rank = (a: string): number =>
    a.startsWith('192.168.') ? 0 : a.startsWith('10.') ? 1 : a.startsWith('172.') ? 2 : 3
  return addresses.sort((a, b) => rank(a) - rank(b)).map((a) => `http://${a}:${port}`)
}

let settings: RemoteSettings = { enabled: false, port: DEFAULT_PORT, pin: newPin(), tokens: [] }
let server: http.Server | null = null
let listeningPort: number | null = null
let lastError: string | null = null
let state: RemoteState = IDLE_REMOTE_STATE
const failures = new Map<string, { count: number; lockedUntil: number }>()
let getWindow: () => BrowserWindow | null = () => null

async function loadSettings(): Promise<void> {
  try {
    const raw = JSON.parse(await fs.readFile(settingsFile(), 'utf-8'))
    settings = {
      enabled: raw.enabled === true,
      port:
        Number.isInteger(raw.port) && raw.port >= 1024 && raw.port <= 65535
          ? raw.port
          : DEFAULT_PORT,
      pin: typeof raw.pin === 'string' && /^\d{4}$/.test(raw.pin) ? raw.pin : newPin(),
      tokens: Array.isArray(raw.tokens)
        ? raw.tokens.filter((t: unknown) => typeof t === 'string').slice(-MAX_TOKENS)
        : []
    }
  } catch {
    // First run (or an unreadable file): keep the defaults, with a fresh PIN.
  }
}

async function saveSettings(): Promise<void> {
  await fs.writeFile(settingsFile(), JSON.stringify(settings), 'utf-8')
}

function status(): RemoteServerStatus {
  return {
    enabled: settings.enabled,
    running: listeningPort !== null,
    port: listeningPort ?? settings.port,
    pin: settings.pin,
    urls: listeningPort !== null ? lanUrls(listeningPort) : [],
    error: lastError
  }
}

function send(
  res: http.ServerResponse,
  code: number,
  body: unknown,
  type = 'application/json'
): void {
  const payload = typeof body === 'string' ? body : JSON.stringify(body)
  res.writeHead(code, {
    'Content-Type': `${type}; charset=utf-8`,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  })
  res.end(payload)
}

function readJson(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}'))
      } catch {
        reject(new Error('bad json'))
      }
    })
    req.on('error', reject)
  })
}

function isAuthorized(req: http.IncomingMessage): boolean {
  const token = req.headers['x-remote-token']
  return typeof token === 'string' && settings.tokens.some((t) => sameSecret(t, token))
}

async function handleLogin(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const ip = req.socket.remoteAddress ?? 'unknown'
  const now = Date.now()
  const record = failures.get(ip)
  if (record && record.lockedUntil > now) {
    send(res, 429, { error: 'Too many wrong PINs. Wait a minute and try again.' })
    return
  }
  const body = (await readJson(req)) as { pin?: unknown }
  const pin = typeof body.pin === 'string' ? body.pin.trim() : ''
  if (!sameSecret(pin, settings.pin)) {
    const count = (record?.count ?? 0) + 1
    failures.set(ip, {
      count: count >= MAX_FAILURES ? 0 : count,
      lockedUntil: count >= MAX_FAILURES ? now + LOCKOUT_MS : 0
    })
    send(res, 401, { error: "That PIN isn't right. It's shown in the app under 📱 Remote." })
    return
  }
  failures.delete(ip)
  const token = crypto.randomBytes(24).toString('hex')
  settings.tokens = [...settings.tokens, token].slice(-MAX_TOKENS)
  await saveSettings()
  send(res, 200, { token })
}

async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://remote')
  if (req.method === 'GET' && url.pathname === '/') {
    send(res, 200, remotePage.replace('<!--LOGO-->', logoSvg), 'text/html')
    return
  }
  if (req.method === 'GET' && url.pathname === '/logo.svg') {
    send(res, 200, logoSvg, 'image/svg+xml')
    return
  }
  if (req.method === 'POST' && url.pathname === '/api/login') {
    await handleLogin(req, res)
    return
  }
  if (url.pathname.startsWith('/api/') && !isAuthorized(req)) {
    send(res, 401, { error: 'Enter the PIN again.' })
    return
  }
  if (req.method === 'GET' && url.pathname === '/api/state') {
    send(res, 200, { state, serverNow: Date.now() })
    return
  }
  if (req.method === 'POST' && url.pathname === '/api/command') {
    const command = await readJson(req)
    if (!isRemoteCommand(command)) {
      send(res, 400, { error: 'Unknown command.' })
      return
    }
    const win = getWindow()
    if (!win) {
      send(res, 503, { error: 'The app window is closed.' })
      return
    }
    win.webContents.send('remote:command', command)
    send(res, 200, { ok: true })
    return
  }
  send(res, 404, { error: 'Not found.' })
}

function listenOn(port: number): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const s = http.createServer((req, res) => {
      handle(req, res).catch(() => {
        if (!res.headersSent) send(res, 400, { error: 'Bad request.' })
      })
    })
    s.once('error', reject)
    s.listen(port, '0.0.0.0', () => {
      s.off('error', reject)
      resolve(s)
    })
  })
}

async function start(): Promise<void> {
  if (server) return
  lastError = null
  for (let i = 0; i < PORT_ATTEMPTS; i++) {
    const port = settings.port + i
    try {
      server = await listenOn(port)
      listeningPort = port
      return
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EADDRINUSE') {
        lastError = (err as Error).message
        return
      }
    }
  }
  lastError = `Ports ${settings.port}–${settings.port + PORT_ATTEMPTS - 1} are all in use.`
}

async function stop(): Promise<void> {
  const s = server
  server = null
  listeningPort = null
  if (s) await new Promise<void>((resolve) => s.close(() => resolve()))
}

export async function initRemote(windowGetter: () => BrowserWindow | null): Promise<void> {
  getWindow = windowGetter
  await loadSettings()
  if (settings.enabled) await start()

  ipcMain.handle('remote:status', (): RemoteServerStatus => status())

  ipcMain.handle('remote:setEnabled', async (_evt, enabled: boolean) => {
    settings.enabled = enabled === true
    await saveSettings()
    if (settings.enabled) await start()
    else await stop()
    return status()
  })

  /** A new PIN also signs out every phone that used the old one. */
  ipcMain.handle('remote:newPin', async () => {
    settings.pin = newPin()
    settings.tokens = []
    await saveSettings()
    return status()
  })

  ipcMain.on('remote:state', (_evt, next: RemoteState) => {
    if (typeof next === 'object' && next !== null) state = { ...IDLE_REMOTE_STATE, ...next }
  })
}

export function shutdownRemote(): Promise<void> {
  return stop()
}
