import { describe, expect, it } from 'vitest'
import {
  aiReady,
  describeHttpError,
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
  openAiImageSize,
  isLocalAddress,
  type AiConfigView
} from './ai'

describe('picture options per model', () => {
  it('asks each OpenAI model for a size it accepts', () => {
    expect(openAiImageSize('gpt-image-1')).toBe('1536x1024')
    expect(openAiImageSize('dall-e-3')).toBe('1792x1024')
    expect(openAiImageSize('dall-e-2')).toBe('1024x1024')
    expect(openAiImageSize('stable-diffusion')).toBeUndefined()
  })

  it('asks DALL-E for the picture itself, and nobody else', () => {
    const body = (model: string): Record<string, unknown> =>
      JSON.parse(openAiImageRequest('https://x/v1', 'k', model, 'p').init.body!)
    expect(body('dall-e-3').response_format).toBe('b64_json')
    expect(body('gpt-image-1').response_format).toBeUndefined()
    expect(body('local-model').size).toBeUndefined()
  })
})

describe('isLocalAddress', () => {
  it('treats this PC and private networks as local', () => {
    for (const url of [
      'http://localhost:11434/v1',
      'http://127.0.0.1:1234',
      'http://[::1]:8080',
      'http://192.168.1.20:1234/v1',
      'http://10.0.0.5',
      'http://172.20.1.1',
      'http://gpu-box.local:8080'
    ]) {
      expect(isLocalAddress(url), url).toBe(true)
    }
  })

  it('treats everything else as remote', () => {
    for (const url of [
      'http://api.example.com/v1',
      'http://172.32.0.1',
      'http://8.8.8.8',
      'nonsense'
    ]) {
      expect(isLocalAddress(url), url).toBe(false)
    }
  })
})

describe('OpenAI and compatible requests', () => {
  it('builds a chat request with the key only when there is one', () => {
    const withKey = openAiChatRequest('https://api.openai.com/v1/', 'sk-1', 'gpt-x', 'Hi')
    expect(withKey.url).toBe('https://api.openai.com/v1/chat/completions')
    expect(withKey.init.headers.Authorization).toBe('Bearer sk-1')
    expect(JSON.parse(withKey.init.body!)).toEqual({
      model: 'gpt-x',
      messages: [{ role: 'user', content: 'Hi' }]
    })
    const local = openAiChatRequest('http://localhost:11434/v1', '', 'llama', 'Hi')
    expect(local.init.headers.Authorization).toBeUndefined()
  })

  it('reads chat replies, including content given as parts', () => {
    expect(parseOpenAiChat({ choices: [{ message: { content: 'Hello' } }] })).toBe('Hello')
    expect(
      parseOpenAiChat({ choices: [{ message: { content: [{ type: 'text', text: 'Hi' }] } }] })
    ).toBe('Hi')
    expect(() => parseOpenAiChat({ choices: [] })).toThrow(/empty/)
  })

  it('asks for a wide picture and reads it back', () => {
    const req = openAiImageRequest('https://api.openai.com/v1', 'k', 'gpt-image-1', 'a cat')
    expect(req.url).toBe('https://api.openai.com/v1/images/generations')
    expect(JSON.parse(req.init.body!)).toMatchObject({ model: 'gpt-image-1', size: '1536x1024' })
    expect(parseOpenAiImage({ data: [{ b64_json: 'AAA' }] })).toEqual({
      mimeType: 'image/png',
      base64: 'AAA'
    })
    expect(parseOpenAiImage({ data: [{ url: 'https://cdn.example/p.png' }] })).toEqual({
      url: 'https://cdn.example/p.png'
    })
    expect(() => parseOpenAiImage({ data: [{ url: 'file:///etc/passwd' }] })).toThrow(/picture/)
    expect(() => parseOpenAiImage({ data: [] })).toThrow(/picture/)
  })
})

describe('Gemini requests', () => {
  it('sends the key in x-goog-api-key and reads the text parts', () => {
    const req = geminiTextRequest(
      'https://generativelanguage.googleapis.com',
      'g',
      'gemini-3.8-flash',
      'Hi'
    )
    expect(req.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'
    )
    expect(req.init.headers['x-goog-api-key']).toBe('g')
    expect(
      parseGeminiText({ candidates: [{ content: { parts: [{ text: 'A' }, { text: 'B' }] } }] })
    ).toBe('AB')
    expect(() => parseGeminiText({ promptFeedback: { blockReason: 'SAFETY' } })).toThrow(/SAFETY/)
  })

  it('asks for a 16:9 picture and finds the image part', () => {
    const req = geminiImageRequest('https://generativelanguage.googleapis.com', 'g', 'img', 'x')
    expect(JSON.parse(req.init.body!).generationConfig.responseFormat.image.aspectRatio).toBe(
      '16:9'
    )
    const image = parseGeminiImage({
      candidates: [
        {
          content: {
            parts: [{ text: 'Here' }, { inlineData: { mimeType: 'image/jpeg', data: 'BBB' } }]
          }
        }
      ]
    })
    expect(image).toEqual({ mimeType: 'image/jpeg', base64: 'BBB' })
  })
})

describe('model lists', () => {
  it('reads OpenAI-style and Gemini lists', () => {
    expect(parseModelList('openai', { data: [{ id: 'b' }, { id: 'a' }] })).toEqual(['a', 'b'])
    expect(parseModelList('gemini', { models: [{ name: 'models/gemini-x' }] })).toEqual([
      'gemini-x'
    ])
    expect(modelListRequest('compatible', 'http://h/v1', '').url).toBe('http://h/v1/models')
  })
})

describe('describeHttpError', () => {
  it('explains common failures in plain words', () => {
    expect(describeHttpError(401, '{"error":{"message":"bad key"}}', 'OpenAI')).toBe(
      "OpenAI didn't accept the API key.\n\nbad key"
    )
    expect(describeHttpError(429, '', 'Gemini')).toMatch(
      /too many requests or you're out of credit/
    )
    expect(describeHttpError(404, 'nope', 'X')).toMatch(/Load models/)
  })
})

describe('aiReady', () => {
  const base = (): AiConfigView => ({
    active: 'anthropic',
    encrypted: true,
    providers: {
      anthropic: {
        textModel: 'claude-opus-5-5',
        imageModel: '',
        baseUrl: '',
        hasKey: true,
        keyHint: '1234'
      },
      openai: { textModel: 'gpt', imageModel: 'img', baseUrl: 'u', hasKey: false, keyHint: '' },
      gemini: { textModel: 'g', imageModel: 'gi', baseUrl: 'u', hasKey: true, keyHint: 'x' },
      compatible: {
        textModel: 'llama',
        imageModel: '',
        baseUrl: 'http://localhost:11434/v1',
        hasKey: false,
        keyHint: ''
      }
    }
  })

  it('needs a key for hosted services, and pictures only where supported', () => {
    expect(aiReady(base())).toEqual({ text: true, images: false })
    expect(aiReady({ ...base(), active: 'openai' })).toEqual({ text: false, images: false })
    expect(aiReady({ ...base(), active: 'gemini' })).toEqual({ text: true, images: true })
    expect(aiReady({ ...base(), active: 'compatible' })).toEqual({ text: true, images: false })
    expect(aiReady({ ...base(), active: null })).toEqual({ text: false, images: false })
  })
})
