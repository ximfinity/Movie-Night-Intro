import { app, ipcMain, safeStorage } from 'electron'
import { join } from 'path'
import fs from 'fs/promises'
import {
  AI_PROVIDERS,
  describeHttpError,
  retryDelayMs,
  findProvider,
  geminiImageRequest,
  geminiTextRequest,
  modelListRequest,
  openAiChatRequest,
  openAiImageRequest,
  parseGeminiImage,
  parseGeminiText,
  parseModelList,
  parseOpenAiChat,
  parseOpenAiImage,
  isLocalAddress,
  type ImageReply,
  type AiConfigView,
  type AiProviderId,
  type AiSettingsPatch,
  type GeneratedImage,
  type HttpRequest
} from '../../shared/ai'
import { claudeModels, claudeText } from './anthropic'

/** "Bring your own AI": the user's provider choice, models and API keys, kept in the
 * app's user-data folder (never in project files). Keys are encrypted with the OS
 * (Windows DPAPI via Electron safeStorage) and never sent to the renderer. */

interface StoredProvider {
  textModel: string
  imageModel: string
  baseUrl: string
  /** base64 of the encrypted key, or the plain key when encryption is unavailable. */
  key: string
  keyEncrypted: boolean
}

interface Stored {
  active: AiProviderId | null
  providers: Partial<Record<AiProviderId, StoredProvider>>
}

const MAX_PROMPT_CHARS = 100_000
const MAX_IMAGE_BYTES = 25 * 1024 * 1024
const TEXT_TIMEOUT_MS = 90_000
const IMAGE_TIMEOUT_MS = 180_000

let stored: Stored = { active: null, providers: {} }

function configFile(): string {
  return join(app.getPath('userData'), 'ai.json')
}

async function load(): Promise<void> {
  let text: string
  try {
    text = await fs.readFile(configFile(), 'utf-8')
  } catch {
    return // First run: nothing connected.
  }
  try {
    const raw = JSON.parse(text)
    stored = {
      active: AI_PROVIDERS.some((p) => p.id === raw.active) ? raw.active : null,
      providers: typeof raw.providers === 'object' && raw.providers ? raw.providers : {}
    }
  } catch (err) {
    // Keep the damaged file for recovery rather than overwriting it on the next save.
    console.error('AI settings file is damaged; starting fresh:', err)
    await fs.rename(configFile(), `${configFile()}.damaged`).catch(() => {})
  }
}

let saving: Promise<void> = Promise.resolve()

/** Crash-safe and one at a time: write a temp file, then swap it into place, so a power
 * cut or two quick changes can never leave a half-written file (and lost keys). */
function save(): Promise<void> {
  const data = JSON.stringify(stored, null, 2)
  saving = saving
    .catch(() => {})
    .then(async () => {
      const target = configFile()
      const tmp = `${target}.tmp`
      await fs.writeFile(tmp, data, 'utf-8')
      try {
        await fs.rename(tmp, target)
      } catch (err) {
        // Windows can briefly lock a file (antivirus, indexer); one retry covers that.
        if ((err as NodeJS.ErrnoException).code !== 'EPERM') throw err
        await new Promise((r) => setTimeout(r, 150))
        await fs.rename(tmp, target)
      }
    })
  return saving
}

function providerSettings(id: AiProviderId): StoredProvider {
  const info = findProvider(id)
  const s = stored.providers[id]
  return {
    textModel: s?.textModel ?? info.defaultTextModel,
    imageModel: s?.imageModel ?? info.defaultImageModel,
    baseUrl: s?.baseUrl || info.defaultBaseUrl,
    key: s?.key ?? '',
    keyEncrypted: s?.keyEncrypted ?? false
  }
}

function readKey(id: AiProviderId): string {
  const s = providerSettings(id)
  if (!s.key) return ''
  if (!s.keyEncrypted) return s.key
  try {
    return safeStorage.decryptString(Buffer.from(s.key, 'base64'))
  } catch {
    throw new Error('The saved API key could not be unlocked on this PC. Enter it again.')
  }
}

function view(): AiConfigView {
  const providers = {} as AiConfigView['providers']
  for (const p of AI_PROVIDERS) {
    const s = providerSettings(p.id)
    let hint = ''
    try {
      hint = s.key ? readKey(p.id).slice(-4) : ''
    } catch {
      hint = '????'
    }
    providers[p.id] = {
      textModel: s.textModel,
      imageModel: s.imageModel,
      baseUrl: s.baseUrl,
      hasKey: !!s.key,
      keyHint: hint
    }
  }
  return { active: stored.active, providers, encrypted: safeStorage.isEncryptionAvailable() }
}

function checkUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`"${url}" isn't a valid server address.`)
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('The server address must start with http:// or https://')
  }
}

async function callJson<T>(
  req: HttpRequest,
  parse: (json: unknown) => T,
  label: string,
  timeoutMs: number
): Promise<T> {
  checkUrl(req.url)
  let res: Response
  let body: string
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(req.url, { ...req.init, signal: AbortSignal.timeout(timeoutMs) })
    } catch (err) {
      const timedOut = (err as Error)?.name === 'TimeoutError'
      throw new Error(
        timedOut
          ? `${label} took too long to answer. Try again.`
          : `Couldn't reach ${label}. Is this PC online, and is the address right?`
      )
    }
    body = await res.text()
    if (res.ok) break
    // Busy services ("high demand", 503) usually recover within seconds: retry quietly.
    const wait = retryDelayMs(res.status, res.headers.get('retry-after'), attempt)
    if (wait === null) throw new Error(describeHttpError(res.status, body, label))
    await new Promise((r) => setTimeout(r, wait))
  }
  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    throw new Error(`${label} sent back something that isn't JSON. Is the address right?`)
  }
  return parse(json)
}

function requireReady(id: AiProviderId): { key: string; s: StoredProvider; label: string } {
  const info = findProvider(id)
  const s = providerSettings(id)
  const key = readKey(id)
  if (info.needsKey && !key) throw new Error(`Add your ${info.label} API key in ✨ AI settings.`)
  if (!s.textModel) throw new Error('Choose a text model in ✨ AI settings.')
  return { key, s, label: info.label }
}

export async function generateText(prompt: string, providerId?: AiProviderId): Promise<string> {
  const id = providerId ?? stored.active
  if (!id) throw new Error('Connect an AI in ✨ AI settings first.')
  if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('Nothing to ask the AI.')
  if (prompt.length > MAX_PROMPT_CHARS) {
    throw new Error('That request is too long for the AI. Try a smaller group of slides.')
  }
  const text = prompt
  const { key, s, label } = requireReady(id)
  checkKeyTransport(id, s.baseUrl, key)
  switch (id) {
    case 'anthropic':
      return claudeText(key, s.textModel, text)
    case 'gemini':
      return callJson(
        geminiTextRequest(s.baseUrl, key, s.textModel, text),
        parseGeminiText,
        label,
        TEXT_TIMEOUT_MS
      )
    default:
      return callJson(
        openAiChatRequest(s.baseUrl, key, s.textModel, text),
        parseOpenAiChat,
        label,
        TEXT_TIMEOUT_MS
      )
  }
}

export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const id = stored.active
  if (!id) throw new Error('Connect an AI in ✨ AI settings first.')
  const info = findProvider(id)
  if (!info.supportsImages) {
    throw new Error(`${info.label} can't make pictures. Pick one from your library instead.`)
  }
  const { key, s, label } = requireReady(id)
  checkKeyTransport(id, s.baseUrl, key)
  if (!s.imageModel) throw new Error('Choose a picture model in ✨ AI settings.')
  const text = String(prompt ?? '').slice(0, 4000)
  if (id === 'gemini') {
    return callJson(
      geminiImageRequest(s.baseUrl, key, s.imageModel, text),
      parseGeminiImage,
      label,
      IMAGE_TIMEOUT_MS
    )
  }
  const reply = await callJson<ImageReply>(
    openAiImageRequest(s.baseUrl, key, s.imageModel, text),
    parseOpenAiImage,
    label,
    IMAGE_TIMEOUT_MS
  )
  return 'url' in reply ? downloadImage(reply.url, label) : reply
}

/** Fetches a picture the AI replied with a link to. */
async function downloadImage(url: string, label: string): Promise<GeneratedImage> {
  checkUrl(url)
  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) })
  } catch {
    throw new Error(`Couldn't download the picture from ${label}.`)
  }
  if (!res.ok) throw new Error(`Couldn't download the picture from ${label} (error ${res.status}).`)
  const mimeType = (res.headers.get('content-type') ?? 'image/png').split(';')[0].trim()
  if (!mimeType.startsWith('image/'))
    throw new Error(`${label} sent back a link that isn't a picture.`)
  const bytes = Buffer.from(await res.arrayBuffer())
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error('That picture is too large.')
  return { mimeType, base64: bytes.toString('base64') }
}

/** Never send an API key unencrypted across the internet: over plain http only to this PC
 * or the local network. */
function checkKeyTransport(id: AiProviderId, baseUrl: string, key: string): void {
  if (id !== 'compatible' || !key) return
  if (/^http:\/\//i.test(baseUrl.trim()) && !isLocalAddress(baseUrl)) {
    throw new Error(
      "This server address uses http://, which would send your API key unencrypted. Use its https:// address, or remove the key if the server doesn't need one."
    )
  }
}

async function listModels(id: AiProviderId): Promise<string[]> {
  const info = findProvider(id)
  const s = providerSettings(id)
  const key = readKey(id)
  if (info.needsKey && !key) throw new Error(`Add your ${info.label} API key first.`)
  if (id === 'anthropic') return claudeModels(key)
  checkKeyTransport(id, s.baseUrl, key)
  return callJson(
    modelListRequest(id, s.baseUrl, key),
    (json) => parseModelList(id, json),
    info.label,
    TEXT_TIMEOUT_MS
  )
}

function assertProvider(id: unknown): asserts id is AiProviderId {
  if (!AI_PROVIDERS.some((p) => p.id === id)) throw new Error('Unknown AI provider.')
}

export function initAi(): void {
  // Handlers are registered straight away (so an early call can't hit "no handler") and
  // each waits for the settings to finish loading.
  const ready = load()
  const handle = <A extends unknown[], R>(
    channel: string,
    fn: (...args: A) => R | Promise<R>
  ): void => {
    ipcMain.handle(channel, async (_evt, ...args) => {
      await ready
      return fn(...(args as A))
    })
  }

  handle('ai:getConfig', (): AiConfigView => view())

  handle('ai:updateSettings', async (patch: AiSettingsPatch): Promise<AiConfigView> => {
    if (patch.active !== undefined) {
      if (patch.active !== null) assertProvider(patch.active)
      stored.active = patch.active
    }
    if (patch.provider !== undefined) {
      assertProvider(patch.provider)
      const next = { ...providerSettings(patch.provider) }
      if (typeof patch.textModel === 'string') next.textModel = patch.textModel.trim()
      if (typeof patch.imageModel === 'string') next.imageModel = patch.imageModel.trim()
      if (typeof patch.baseUrl === 'string') {
        const url = patch.baseUrl.trim()
        if (url) checkUrl(url)
        next.baseUrl = url
      }
      stored.providers[patch.provider] = next
    }
    await save()
    return view()
  })

  handle('ai:setKey', async (id: AiProviderId, key: string): Promise<AiConfigView> => {
    assertProvider(id)
    const clean = String(key ?? '').trim()
    const encrypt = !!clean && safeStorage.isEncryptionAvailable()
    stored.providers[id] = {
      ...providerSettings(id),
      key: clean ? (encrypt ? safeStorage.encryptString(clean).toString('base64') : clean) : '',
      keyEncrypted: encrypt
    }
    await save()
    return view()
  })

  handle('ai:listModels', (id: AiProviderId): Promise<string[]> => {
    assertProvider(id)
    return listModels(id)
  })

  handle('ai:test', async (id: AiProviderId): Promise<string> => {
    assertProvider(id)
    const reply = await generateText(
      'This is a connection test from a movie-night app. Reply with one short, cheerful sentence about popcorn.',
      id
    )
    return reply.trim().slice(0, 300)
  })

  handle('ai:text', (prompt: string): Promise<string> => generateText(prompt))

  handle('ai:image', (prompt: string): Promise<GeneratedImage> => generateImage(prompt))
}
