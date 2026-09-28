import { describe, expect, it } from 'vitest'
import {
  EMPTY_DETAILS,
  THEME_NIGHTS,
  buildSection,
  buildShow,
  fillPlaceholders,
  toLines
} from './builtinTemplates'
import { findSlideTheme, SLIDE_THEMES } from './slideThemes'
import { SUBTITLE_MAX_CHARS } from './types'

describe('fillPlaceholders', () => {
  const d = {
    ...EMPTY_DETAILS,
    movieTitle: 'Hocus Pocus',
    guestOfHonor: 'Maya',
    orgName: 'Lincoln'
  }

  it('fills the movie, guest of honor and school', () => {
    expect(fillPlaceholders('Now Showing: {movie}', d)).toBe('Now Showing: Hocus Pocus')
    expect(fillPlaceholders('Happy Birthday, {name}!', d)).toBe('Happy Birthday, Maya!')
    expect(fillPlaceholders('Welcome to {org} Movie Night!', d)).toBe(
      'Welcome to Lincoln Movie Night!'
    )
  })

  it('reads naturally when a detail is blank', () => {
    expect(fillPlaceholders('Now Showing: {movie}', EMPTY_DETAILS)).toBe('Now Showing')
    expect(fillPlaceholders('Get cozy. {movie} starts soon', EMPTY_DETAILS)).toBe(
      'Get cozy. the movie starts soon'
    )
    expect(fillPlaceholders('Welcome to {org} Movie Night!', EMPTY_DETAILS)).toBe(
      'Welcome to Our Movie Night!'
    )
  })
})

describe('built-in theme nights', () => {
  it('only use real slide themes', () => {
    const ids = new Set(SLIDE_THEMES.map((t) => t.id))
    for (const night of THEME_NIGHTS) {
      for (const p of night.palette) expect(ids.has(p), `${night.id}: ${p}`).toBe(true)
    }
  })

  it('build every section with written lines that fit on one line', () => {
    for (const night of THEME_NIGHTS) {
      for (const section of night.sections) {
        const item = buildSection(section, night.id, { ...EMPTY_DETAILS, movieTitle: 'Jaws' })
        expect(item, `${night.id}/${section}`).not.toBeNull()
        for (const f of item!.frames) {
          expect(f.title, `${night.id}/${section}`).not.toMatch(/[{}]/)
          if (f.aiKind === 'trivia') continue
          const lines = f.subtitleOptions.filter((s) => s.trim())
          expect(lines.length, `${night.id}/${section}/${f.title}`).toBeGreaterThan(0)
          for (const l of lines) {
            expect(l, `${night.id}/${f.title}`).not.toMatch(/[{}]/)
            expect(l.length, l).toBeLessThanOrEqual(SUBTITLE_MAX_CHARS)
          }
        }
      }
    }
  })

  it('makes a PTA price list and trivia slide the AI fills in', () => {
    const show = buildShow('pta', ['concessions', 'feature'], {
      ...EMPTY_DETAILS,
      movieTitle: 'Moana',
      orgName: 'Lincoln Elementary',
      concessions: ['Popcorn | $3']
    })
    const menu = show.bySection.concessions!.frames[0]
    expect(menu.bodyStyle).toBe('list')
    expect(menu.subtitleOptions).toEqual(['Popcorn | $3'])
    const trivia = show.bySection.feature!.frames.find((f) => f.aiKind === 'trivia')!
    expect(trivia.title).toBe('Fun Facts: Moana')
    expect(show.aiPrompt.event).toBe(
      "School PTA family movie night at Lincoln Elementary. Tonight's movie: Moana"
    )
  })

  it('keeps the theme order, only the chosen sections, and varies colors', () => {
    const show = buildShow('halloween', ['feature', 'welcome', 'snacks'], EMPTY_DETAILS)
    expect(show.items.map((i) => i.name)).toEqual(['Welcome', 'Snacks', "Tonight's Feature"])
    const looks = show.items.map((i) => findSlideTheme(i.frames[0].theme).id)
    expect(new Set(looks).size).toBe(3)
    expect(new Set(show.items.map((i) => i.id)).size).toBe(3)
  })
})

describe('toLines', () => {
  it('drops blank lines and trims', () => {
    expect(toLines(' a \r\n\nb\n  ')).toEqual(['a', 'b'])
  })
})
