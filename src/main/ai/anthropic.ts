import Anthropic from '@anthropic-ai/sdk'

/** Models that accept the server-side refusal fallback (see the Claude API docs). */
const FALLBACK_MODELS = new Set([
  'claude-fable-5-1',
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-sonnet-5-5'
])

function client(apiKey: string): Anthropic {
  // ANTHROPIC_BASE_URL (if set in the environment) is honoured by the SDK, which is how
  // the end-to-end tests point it at a local stand-in server. Replies are streamed, so a
  // long answer isn't cut off by a request timeout; the SDK's own defaults apply.
  return new Anthropic({ apiKey, maxRetries: 1 })
}

/** Turns SDK errors into something a person can act on. Most specific first. */
function friendly(err: unknown): Error {
  if (err instanceof Anthropic.AuthenticationError) {
    return new Error("Claude didn't accept the API key. Check it in ✨ AI settings.")
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return new Error("This API key isn't allowed to use that model.")
  }
  if (err instanceof Anthropic.NotFoundError) {
    return new Error('Claude doesn\'t know that model name. Try "Load models".')
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new Error('Claude says slow down (rate limit). Wait a moment and try again.')
  }
  if (err instanceof Anthropic.BadRequestError) {
    return new Error(`Claude couldn't do that: ${err.message}`)
  }
  // A timeout is a kind of connection error, so it's checked first.
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return new Error('Claude took too long to answer. Try again, or ask for fewer lines.')
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new Error("Couldn't reach Claude. Is this PC online?")
  }
  if (err instanceof Anthropic.APIError) {
    return new Error(`Claude had a problem (error ${err.status}). Try again in a minute.`)
  }
  return err instanceof Error ? err : new Error(String(err))
}

interface TextResponse {
  stop_reason: string | null
  content: { type: string; text?: string }[]
}

function textOf(response: TextResponse): string {
  if (response.stop_reason === 'refusal') {
    throw new Error('Claude declined to write that. Try rewording the event or tone.')
  }
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
  if (!text.trim()) throw new Error('Claude sent back an empty reply.')
  return text
}

export async function claudeText(apiKey: string, model: string, prompt: string): Promise<string> {
  const c = client(apiKey)
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]
  try {
    if (FALLBACK_MODELS.has(model)) {
      // If a safety classifier declines, the API retries on a fallback model in the same call.
      const response = await c.beta.messages
        .stream({
          model,
          max_tokens: 16000,
          messages,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default'
        })
        .finalMessage()
      return textOf(response)
    }
    const response = await c.messages.stream({ model, max_tokens: 16000, messages }).finalMessage()
    return textOf(response)
  } catch (err) {
    throw friendly(err)
  }
}

export async function claudeModels(apiKey: string): Promise<string[]> {
  try {
    const ids: string[] = []
    for await (const model of client(apiKey).models.list()) ids.push(model.id)
    return ids
  } catch (err) {
    throw friendly(err)
  }
}
