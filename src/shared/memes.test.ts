import { describe, expect, it } from 'vitest'
import {
  BUILTIN_MEME_CAPTIONS,
  buildMemeCaptionPrompt,
  buildMemeImagePrompt,
  parseMemeCaptions
} from './memes'

describe('parseMemeCaptions', () => {
  it('reads TOP/BOTTOM lines, tolerating bullets, bold and quotes', () => {
    const reply = [
      'Here are some ideas:',
      '1. TOP: Me at the snack table | BOTTOM: Just one more handful',
      '- **Top: "When the lights go down" / Bottom: "Phones go dark"**',
      'Brace yourselves | Spoilers are coming',
      'Enjoy!'
    ].join('\n')
    expect(parseMemeCaptions(reply)).toEqual([
      { top: 'Me at the snack table', bottom: 'Just one more handful' },
      { top: 'When the lights go down', bottom: 'Phones go dark' },
      { top: 'Brace yourselves', bottom: 'Spoilers are coming' }
    ])
  })

  it('ignores chatter and code fences', () => {
    expect(parseMemeCaptions('```\nnothing here\n```')).toEqual([])
  })
})

describe('meme prompts', () => {
  it('asks for the parseable format with the event and topics', () => {
    const p = buildMemeCaptionPrompt({
      context: 'Snacks, No Spoilers',
      event: 'PTA night',
      tone: 'punny',
      count: 6
    })
    expect(p).toContain('Event: PTA night')
    expect(p).toContain('Topics to riff on: Snacks, No Spoilers')
    expect(p).toContain('exactly 6 captions')
    expect(p).toContain('TOP: first line | BOTTOM: second line')
    expect(p).not.toMatch(/\n\n\n/)
  })

  it('keeps lettering out of AI pictures', () => {
    expect(buildMemeImagePrompt('a nervous popcorn bucket')).toMatch(
      /^a nervous popcorn bucket .*do not include any text/i
    )
  })

  it('ships ready-made captions that fit', () => {
    for (const c of BUILTIN_MEME_CAPTIONS) {
      expect(c.top.length + c.bottom.length).toBeLessThan(80)
    }
  })
})
