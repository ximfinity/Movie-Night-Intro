import { app, ipcMain, safeStorage } from 'electron'
import { join } from 'path'
import fs from 'fs/promises'
import {
  AI_PROVIDERS,
  describeHttpError,
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

const MAX_PROMPT_CHARS = 20_000
const TEXT_TIMEOUT_MS = 90_000
const IMAGE_TIMEOUT_MS = 180_000

let stored: Stored = { active: null, providers: {} }

function configFile(): string {
  return join(app.getPath('userData'), 'ai.json')
}

async function load(): Promise<void> {
  try {
    const raw = JSON.parse(await fs.readFile(configFile(), 'utf-8'))
    stored = {
      active: AI_PROVIDERS.some((p) => p.id === raw.active) ? raw.active : null,
      providers: typeof raw.providers === 'object' && raw.providers ? raw.providers : {}
    }
  } catch {
    // First run: nothing connected.
  }
}

async function save(): Promise<void> {
  await fs.writeFile(configFile(), JSON.stringify(stored, null, 2), 'utf-8')
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
  const body = await res.text()
  if (!res.ok) throw new Error(describeHttpError(res.status, body, label))
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
  const text = prompt.slice(0, MAX_PROMPT_CHARS)
  const { key, s, label } = requireReady(id)
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
  return callJson(
    openAiImageRequest(s.baseUrl, key, s.imageModel, text),
    parseOpenAiImage,
    label,
    IMAGE_TIMEOUT_MS
  )
}

async function listModels(id: AiProviderId): Promise<string[]> {
  const info = findProvider(id)
  const s = providerSettings(id)
  const key = readKey(id)
  if (info.needsKey && !key) throw new Error(`Add your ${info.label} API key first.`)
  if (id === 'anthropic') return claudeModels(key)
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

export async function initAi(): Promise<void> {
  await load()

  ipcMain.handle('ai:getConfig', (): AiConfigView => view())

  ipcMain.handle(
    'ai:updateSettings',
    async (_evt, patch: AiSettingsPatch): Promise<AiConfigView> => {
      if (patch.active !== undefined) {
        if (patch.active !== null) assertProvider(patch.active)
        stored.active = patch.active
      }
      if (patch.provider !== undefined) {
        assertProvider(patch.provider)
        const current = providerSettings(patch.provider)
        const next = { ...current }
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
    }
  )

  ipcMain.handle(
    'ai:setKey',
    async (_evt, id: AiProviderId, key: string): Promise<AiConfigView> => {
      assertProvider(id)
      const clean = String(key ?? '').trim()
      const current = providerSettings(id)
      const encrypt = !!clean && safeStorage.isEncryptionAvailable()
      stored.providers[id] = {
        ...current,
        key: clean ? (encrypt ? safeStorage.encryptString(clean).toString('base64') : clean) : '',
        keyEncrypted: encrypt
      }
      await save()
      return view()
    }
  )

  ipcMain.handle('ai:listModels', async (_evt, id: AiProviderId): Promise<string[]> => {
    assertProvider(id)
    return listModels(id)
  })

  ipcMain.handle('ai:test', async (_evt, id: AiProviderId): Promise<string> => {
    assertProvider(id)
    const reply = await generateText(
      'This is a connection test from a movie-night app. Reply with one short, cheerful sentence about popcorn.',
      id
    )
    return reply.trim().slice(0, 300)
  })

  ipcMain.handle('ai:text', (_evt, prompt: string): Promise<string> => generateText(prompt))

  ipcMain.handle('ai:image', (_evt, prompt: string): Promise<GeneratedImage> =>
    generateImage(prompt)
  )
}
