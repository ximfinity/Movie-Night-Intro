import { describe, expect, it } from 'vitest'
import { buildSubtitlePrompt, cleanLine, parseAiReply, planSubtitleImport } from './aiPrompt'

describe('buildSubtitlePrompt', () => {
  const prompt = buildSubtitlePrompt({
    titles: [
      { title: 'Silence Your Phones', existing: ['Popcorn police are watching', ''] },
      { title: 'No Spoilers', existing: [] }
    ],
    event: "Tonight's movie: The Goonies",
    tone: 'punny',
    perTitle: 4,
    maxChars: 60
  })

  it('lists every title and the settings', () => {
    expect(prompt).toContain('TITLE: Silence Your Phones\nTITLE: No Spoilers')
    expect(prompt).toContain("Event: Tonight's movie: The Goonies")
    expect(prompt).toContain('Tone: punny')
    expect(prompt).toContain('Subtitles per title: 4')
    expect(prompt).toContain('At most 60 characters')
  })

  it('lists existing lines as already used, skipping blanks', () => {
    expect(prompt).toContain('Already used (do not repeat):\nPopcorn police are watching\n')
  })

  it('asks for a single code block in the TITLE: format', () => {
    expect(prompt).toMatch(/```\nTITLE: Silence Your Phones\nfirst subtitle/)
    expect(prompt.trim().endsWith('```')).toBe(true)
  })

  it('asks for real fun facts on trivia slides', () => {
    const p = buildSubtitlePrompt({
      titles: [
        { title: 'Now Showing: Jaws', existing: [] },
        { title: 'Fun Facts: Jaws', existing: [], trivia: true }
      ],
      event: '',
      tone: '',
      perTitle: 5,
      maxChars: 60
    })
    expect(p).toMatch(
      /trivia slides: instead of jokes, write true, verifiable fun facts[^\n]*\nTITLE: Fun Facts: Jaws/
    )
    expect(p).not.toMatch(/trivia slides[^\n]*\n(?:TITLE: [^\n]*\n)*TITLE: Now Showing/)
  })

  it('falls back to sensible defaults', () => {
    const p = buildSubtitlePrompt({
      titles: [{ title: 'Snacks', existing: [] }],
      event: ' ',
      tone: '',
      perTitle: 5,
      maxChars: 60
    })
    expect(p).toContain('Event: A family movie night')
    expect(p).toContain('Tone: silly and punny')
    expect(p).toContain('Already used (do not repeat):\nnone')
  })
})

describe('buildSubtitlePrompt with a huge group', () => {
  it('lists only recent used lines so the reply format stays in the prompt', () => {
    const existing = Array.from({ length: 400 }, (_, i) => `used line number ${i}`)
    const p = buildSubtitlePrompt({
      titles: [{ title: 'Snacks', existing }],
      event: '',
      tone: '',
      perTitle: 5,
      maxChars: 60
    })
    expect(p).not.toContain('used line number 0\n')
    expect(p).toContain('used line number 399')
    expect(p.split('\n').filter((l) => l.startsWith('used line number'))).toHaveLength(150)
    expect(p.trim().endsWith('```')).toBe(true)
  })
})

describe('cleanLine', () => {
  it('strips list markers, numbering, quotes and bold', () => {
    expect(cleanLine('- Butter is a food group')).toBe('Butter is a food group')
    expect(cleanLine('• Butter')).toBe('Butter')
    expect(cleanLine('12. Butter')).toBe('Butter')
    expect(cleanLine('3) Butter')).toBe('Butter')
    expect(cleanLine('"Butter"')).toBe('Butter')
    expect(cleanLine('“Butter”')).toBe('Butter')
    expect(cleanLine('**Butter**')).toBe('Butter')
  })

  it('leaves ordinary lines (and leading numbers that are content) alone', () => {
    expect(cleanLine("Don't touch the remote")).toBe("Don't touch the remote")
    expect(cleanLine('2 minutes until showtime')).toBe('2 minutes until showtime')
  })
})

describe('parseAiReply', () => {
  it('reads only code blocks when present and drops chatter', () => {
    const reply = 'Sure! Here you go:\n\n```\nTITLE: A\none\ntwo\n\nTITLE: B\nthree\n```\nEnjoy!'
    expect(parseAiReply(reply)).toEqual([
      { title: 'A', lines: ['one', 'two'] },
      { title: 'B', lines: ['three'] }
    ])
  })

  it('handles markdown titles and bullets without a code block', () => {
    const reply =
      'Here are some ideas:\n\n**TITLE: Snacks**\n- Grab them fast\n- Butter counts\n\n## Title: Phones\n1. Airplane mode'
    expect(parseAiReply(reply)).toEqual([
      { title: 'Snacks', lines: ['Grab them fast', 'Butter counts'] },
      { title: 'Phones', lines: ['Airplane mode'] }
    ])
  })

  it('returns untitled lines for a plain list', () => {
    expect(parseAiReply('one\n\n two \r\nthree')).toEqual([
      { title: null, lines: ['one', 'two', 'three'] }
    ])
  })

  it('returns nothing for empty text', () => {
    expect(parseAiReply('   \n')).toEqual([])
  })
})

describe('planSubtitleImport', () => {
  const targets = [
    { id: 'f1', title: 'Snacks Are Ready', existing: ['Grab them before Uncle Dave does'] },
    { id: 'f2', title: 'No Spoilers', existing: [''] }
  ]

  it('matches titles ignoring case and punctuation, and skips lines a slide already has', () => {
    const plan = planSubtitleImport(
      [
        { title: 'snacks are ready!', lines: ['grab them before uncle dave does', 'Butter counts'] }
      ],
      targets,
      null
    )
    expect(plan).toEqual([
      { frameId: 'f1', title: 'Snacks Are Ready', lines: ['Butter counts'], duplicates: 1 }
    ])
  })

  it('creates new slides for unknown titles, keeping a typed title’s spelling', () => {
    const plan = planSubtitleImport(
      [{ title: 'bathroom breaks', lines: ['Speed-walking encouraged'] }],
      targets,
      null,
      ['Bathroom Breaks']
    )
    expect(plan).toEqual([
      {
        frameId: undefined,
        title: 'Bathroom Breaks',
        lines: ['Speed-walking encouraged'],
        duplicates: 0
      }
    ])
  })

  it('sends untitled lines to the chosen slide and drops repeats within the reply', () => {
    const plan = planSubtitleImport(
      [{ title: null, lines: ['Zip it', 'zip it', 'Shh'] }],
      targets,
      'f2'
    )
    expect(plan).toEqual([
      { frameId: 'f2', title: 'No Spoilers', lines: ['Zip it', 'Shh'], duplicates: 1 }
    ])
  })

  it('merges repeated sections for the same slide', () => {
    const plan = planSubtitleImport(
      [
        { title: 'No Spoilers', lines: ['a'] },
        { title: 'NO SPOILERS', lines: ['b'] }
      ],
      targets,
      null
    )
    expect(plan).toHaveLength(1)
    expect(plan[0].lines).toEqual(['a', 'b'])
  })
})
