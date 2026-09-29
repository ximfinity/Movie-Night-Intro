// "Bring your own AI": the providers a user can connect with their own API key, plus
// pure request builders / response parsers for the HTTP-based ones (unit-tested, and
// shared by the main process, which makes the actual calls). Claude goes through the
// official Anthropic SDK in src/main/ai/anthropic.ts.

export type AiProviderId = 'anthropic' | 'openai' | 'gemini' | 'compatible'

export interface AiProviderInfo {
  id: AiProviderId
  label: string
  /** Shown under the picker. */
  blurb: string
  needsKey: boolean
  needsBaseUrl: boolean
  supportsImages: boolean
  defaultTextModel: string
  defaultImageModel: string
  defaultBaseUrl: string
  /** Where to get an API key. */
  keyUrl: string
  /** Offered in the model picker before "Load models" fetches the account's real list. */
  textModelSuggestions: string[]
  imageModelSuggestions: string[]
}

export const AI_PROVIDERS: AiProviderInfo[] = [
  {
    id: 'anthropic',
    label: 'Claude (Anthropic)',
    blurb: 'Great at jokes and trivia. Text only: pictures for memes come from your library.',
    needsKey: true,
    needsBaseUrl: false,
    supportsImages: false,
    defaultTextModel: 'claude-opus-5-5',
    defaultImageModel: '',
    defaultBaseUrl: '',
    keyUrl: 'https://platform.claude.com/settings/keys',
    textModelSuggestions: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-4-5'],
    imageModelSuggestions: []
  },
  {
    id: 'openai',
    label: 'OpenAI (ChatGPT)',
    blurb: 'Text and pictures. Model names change often: use "Load models" to see yours.',
    needsKey: true,
    needsBaseUrl: false,
    supportsImages: true,
    defaultTextModel: 'gpt-5-mini',
    defaultImageModel: 'gpt-image-1',
    defaultBaseUrl: 'https://api.openai.com/v1',
    keyUrl: 'https://platform.openai.com/api-keys',
    textModelSuggestions: ['gpt-5-mini', 'gpt-5'],
    imageModelSuggestions: ['gpt-image-1']
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    blurb: 'Text and pictures, with a free tier for light use.',
    needsKey: true,
    needsBaseUrl: false,
    supportsImages: true,
    defaultTextModel: 'gemini-3.8-flash',
    defaultImageModel: 'gemini-3.1-flash-image',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    keyUrl: 'https://aistudio.google.com/apikey',
    textModelSuggestions: ['gemini-3.8-flash'],
    imageModelSuggestions: ['gemini-3.1-flash-image']
  },
  {
    id: 'compatible',
    label: 'Other (OpenAI-compatible)',
    blurb:
      'Ollama or LM Studio on this PC (free, offline), or services like OpenRouter or Groq. Enter the server address.',
    needsKey: false,
    needsBaseUrl: true,
    supportsImages: true,
    defaultTextModel: '',
    defaultImageModel: '',
    defaultBaseUrl: 'http://localhost:11434/v1',
    keyUrl: '',
    textModelSuggestions: [],
    imageModelSuggestions: []
  }
]

export function findProvider(id: string): AiProviderInfo {
  return AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[0]
}

/** Per-provider settings as the renderer sees them (the key itself never leaves main). */
export interface AiProviderSettingsView {
  textModel: string
  imageModel: string
  baseUrl: string
  hasKey: boolean
  /** Last 4 characters, to recognise which key is saved. */
  keyHint: string
}

export interface AiConfigView {
  /** The provider the app uses, or null when AI isn't connected. */
  active: AiProviderId | null
  providers: Record<AiProviderId, AiProviderSettingsView>
  /** False when the OS can't encrypt the key (then it's stored unencrypted, with a warning). */
  encrypted: boolean
}

export interface AiSettingsPatch {
  active?: AiProviderId | null
  provider?: AiProviderId
  textModel?: string
  imageModel?: string
  baseUrl?: string
}

export interface GeneratedImage {
  mimeType: string
  base64: string
}

/** Whether the active provider is ready to generate text (and pictures). */
export function aiReady(config: AiConfigView | null): { text: boolean; images: boolean } {
  if (!config?.active) return { text: false, images: false }
  const info = findProvider(config.active)
  const s = config.providers[config.active]
  const connected =
    (!info.needsKey || s.hasKey) && (!info.needsBaseUrl || !!s.baseUrl) && !!s.textModel
  return { text: connected, images: connected && info.supportsImages && !!s.imageModel }
}

// ---------------------------------------------------------------------------------------
// HTTP request shapes (OpenAI, OpenAI-compatible, Gemini)

export interface HttpRequest {
  url: string
  init: { method: string; headers: Record<string, string>; body?: string }
}

function trimSlash(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

function jsonHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { 'Content-Type': 'application/json', ...extra }
}

function bearer(key: string): Record<string, string> {
  return key ? { Authorization: `Bearer ${key}` } : {}
}

export function openAiChatRequest(
  baseUrl: string,
  key: string,
  model: string,
  prompt: string
): HttpRequest {
  return {
    url: `${trimSlash(baseUrl)}/chat/completions`,
    init: {
      method: 'POST',
      headers: jsonHeaders(bearer(key)),
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] })
    }
  }
}

export function parseOpenAiChat(json: unknown): string {
  const content = (json as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]
    ?.message?.content
  if (typeof content === 'string' && content.trim()) return content
  // Some compatible servers return content as an array of parts.
  if (Array.isArray(content)) {
    const text = content
      .map((p) => (typeof p === 'object' && p && 'text' in p ? String(p.text) : ''))
      .join('')
    if (text.trim()) return text
  }
  throw new Error('The AI sent back an empty reply.')
}

/** Picture size to ask for: each OpenAI image model accepts its own sizes, and unknown
 * (compatible-server) models get the server's default. */
export function openAiImageSize(model: string): string | undefined {
  const m = model.toLowerCase()
  if (m.startsWith('gpt-image')) return '1536x1024'
  if (m.startsWith('dall-e-3')) return '1792x1024'
  if (m.startsWith('dall-e-2')) return '1024x1024'
  return undefined
}

export function openAiImageRequest(
  baseUrl: string,
  key: string,
  model: string,
  prompt: string
): HttpRequest {
  const size = openAiImageSize(model)
  return {
    url: `${trimSlash(baseUrl)}/images/generations`,
    init: {
      method: 'POST',
      headers: jsonHeaders(bearer(key)),
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        ...(size ? { size } : {}),
        // DALL-E replies with a link unless asked for the picture itself; gpt-image models
        // always send the picture and reject this option.
        ...(model.toLowerCase().startsWith('dall-e') ? { response_format: 'b64_json' } : {})
      })
    }
  }
}

/** A picture in the reply, or a link to download it from (many compatible servers). */
export type ImageReply = GeneratedImage | { url: string }

export function parseOpenAiImage(json: unknown): ImageReply {
  const first = (json as { data?: { b64_json?: unknown; url?: unknown }[] })?.data?.[0]
  if (typeof first?.b64_json === 'string' && first.b64_json) {
    return { mimeType: 'image/png', base64: first.b64_json }
  }
  if (typeof first?.url === 'string' && /^https?:\/\//i.test(first.url)) return { url: first.url }
  throw new Error("The AI didn't send back a picture.")
}

/** Whether a server address is on this PC or the local network, where plain http is
 * acceptable (Ollama, LM Studio). Anywhere else, an API key must travel over https. */
export function isLocalAddress(url: string): boolean {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^\[|\]$/g, '')
  } catch {
    return false
  }
  if (host === 'localhost' || host === '::1' || host.endsWith('.local')) return true
  const v4 = host.match(/^(\d+)\.(\d+)\.\d+\.\d+$/)
  if (!v4) return false
  const [a, b] = [Number(v4[1]), Number(v4[2])]
  return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31)
}

export function geminiTextRequest(
  baseUrl: string,
  key: string,
  model: string,
  prompt: string
): HttpRequest {
  return {
    url: `${trimSlash(baseUrl)}/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    init: {
      method: 'POST',
      headers: jsonHeaders({ 'x-goog-api-key': key }),
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  }
}

export function geminiImageRequest(
  baseUrl: string,
  key: string,
  model: string,
  prompt: string
): HttpRequest {
  return {
    url: `${trimSlash(baseUrl)}/v1/models/${encodeURIComponent(model)}:generateContent`,
    init: {
      method: 'POST',
      headers: jsonHeaders({ 'x-goog-api-key': key }),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseFormat: { image: { aspectRatio: '16:9' } } }
      })
    }
  }
}

interface GeminiPart {
  text?: string
  inlineData?: { mimeType?: string; data?: string }
}

function geminiParts(json: unknown): GeminiPart[] {
  const parts = (json as { candidates?: { content?: { parts?: GeminiPart[] } }[] })?.candidates?.[0]
    ?.content?.parts
  return Array.isArray(parts) ? parts : []
}

export function parseGeminiText(json: unknown): string {
  const text = geminiParts(json)
    .map((p) => p.text ?? '')
    .join('')
  if (text.trim()) return text
  const blocked = (json as { promptFeedback?: { blockReason?: string } })?.promptFeedback
    ?.blockReason
  throw new Error(
    blocked ? `Gemini declined that request (${blocked}).` : 'The AI sent back an empty reply.'
  )
}

export function parseGeminiImage(json: unknown): GeneratedImage {
  const part = geminiParts(json).find((p) => p.inlineData?.data)
  if (part?.inlineData?.data) {
    return { mimeType: part.inlineData.mimeType || 'image/png', base64: part.inlineData.data }
  }
  throw new Error("The AI didn't send back a picture.")
}

export function modelListRequest(
  provider: 'openai' | 'compatible' | 'gemini',
  baseUrl: string,
  key: string
): HttpRequest {
  if (provider === 'gemini') {
    return {
      url: `${trimSlash(baseUrl)}/v1beta/models?pageSize=200`,
      init: { method: 'GET', headers: { 'x-goog-api-key': key } }
    }
  }
  return { url: `${trimSlash(baseUrl)}/models`, init: { method: 'GET', headers: bearer(key) } }
}

export function parseModelList(
  provider: 'openai' | 'compatible' | 'gemini',
  json: unknown
): string[] {
  if (provider === 'gemini') {
    const models = (json as { models?: { name?: string }[] })?.models ?? []
    return models
      .map((m) => (m.name ?? '').replace(/^models\//, ''))
      .filter(Boolean)
      .sort()
  }
  const data = (json as { data?: { id?: string }[] })?.data ?? []
  return data
    .map((m) => m.id ?? '')
    .filter(Boolean)
    .sort()
}

/** A readable message for a failed HTTP call to an AI service. */
export function describeHttpError(status: number, body: string, providerLabel: string): string {
  let detail = ''
  try {
    const json = JSON.parse(body)
    detail = String(json?.error?.message ?? json?.message ?? json?.error ?? '')
  } catch {
    detail = body.slice(0, 200)
  }
  const reason =
    status === 401 || status === 403
      ? `${providerLabel} didn't accept the API key.`
      : status === 404
        ? `${providerLabel} doesn't know that model (or address). Try "Load models".`
        : status === 429
          ? `${providerLabel} says you're sending too many requests or you're out of credit.`
          : status >= 500
            ? `${providerLabel} is having trouble right now. Try again in a minute.`
            : `${providerLabel} couldn't do that (error ${status}).`
  return detail ? `${reason}\n\n${detail}` : reason
}
