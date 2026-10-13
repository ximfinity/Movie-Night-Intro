import { describe, expect, it } from 'vitest'
import {
  buildTriviaPrompt,
  isPlayableQuestion,
  parseTriviaReply,
  playableChoices,
  starterQuestions,
  createTriviaQuestion,
  CHOICE_MAX_CHARS,
  QUESTION_MAX_CHARS
} from './trivia'

describe('starter questions', () => {
  it('are all playable and fit on screen, for every theme', () => {
    for (const theme of ['classic', 'halloween', 'christmas', 'kids']) {
      const qs = starterQuestions(theme)
      expect(qs.length).toBeGreaterThanOrEqual(4)
      for (const q of qs) {
        expect(isPlayableQuestion(q), q.question).toBe(true)
        expect(q.question.length).toBeLessThanOrEqual(QUESTION_MAX_CHARS)
        for (const c of q.choices) expect(c.length).toBeLessThanOrEqual(CHOICE_MAX_CHARS)
      }
      expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length)
    }
  })
})

describe('playable questions', () => {
  it('needs a question, two choices and an answer that is filled in', () => {
    const q = createTriviaQuestion({ question: 'Pick', choices: ['a', '', 'c', ''], answer: 2 })
    expect(isPlayableQuestion(q)).toBe(true)
    expect(isPlayableQuestion({ ...q, answer: 1 })).toBe(false)
    expect(isPlayableQuestion({ ...q, question: ' ' })).toBe(false)
    expect(isPlayableQuestion({ ...q, choices: ['', '', 'c', ''] })).toBe(false)
  })

  it('drops blank choices and keeps the answer pointing at the same text', () => {
    const q = createTriviaQuestion({ question: 'Pick', choices: ['a', '', 'c', 'd'], answer: 2 })
    expect(playableChoices(q)).toEqual({ choices: ['a', 'c', 'd'], answer: 1 })
  })
})

describe('trivia prompt', () => {
  it('names the movie, the count, the format and what was already asked', () => {
    const p = buildTriviaPrompt({
      movie: 'Moana',
      event: 'PTA night',
      count: 6,
      existing: ['What kind of fish is Nemo?']
    })
    expect(p).toMatch(/tonight's movie, Moana/)
    expect(p).toMatch(/Number of questions: 6/)
    expect(p).toMatch(/Already asked[^\n]*\nWhat kind of fish is Nemo\?/)
    expect(p).toMatch(/ANSWER: C\nFACT:/)
  })
})

describe('parseTriviaReply', () => {
  it('reads the requested format', () => {
    const qs = parseTriviaReply(
      '```\nQ: Who?\nA) One\nB) Two\nC) Three\nD) Four\nANSWER: B\nFACT: Because.\n\nQ: Where?\nA) Here\nB) There\nANSWER: a\n```'
    )
    expect(qs).toHaveLength(2)
    expect(qs[0]).toMatchObject({
      question: 'Who?',
      choices: ['One', 'Two', 'Three', 'Four'],
      answer: 1,
      note: 'Because.'
    })
    expect(qs[1]).toMatchObject({
      question: 'Where?',
      choices: ['Here', 'There', '', ''],
      answer: 0
    })
  })

  it('tolerates numbering, markdown and "Correct answer"', () => {
    const qs = parseTriviaReply(
      '**1. Which studio made Shrek?**\n- A. Pixar\n- B. DreamWorks\n- C. Disney\n- D. Laika\n**Correct answer:** B\nFun fact: It won the first Oscar for Best Animated Feature.'
    )
    expect(qs).toHaveLength(1)
    expect(qs[0].question).toBe('Which studio made Shrek?')
    expect(qs[0].choices[1]).toBe('DreamWorks')
    expect(qs[0].answer).toBe(1)
    expect(qs[0].note).toMatch(/^It won/)
  })

  it('drops questions without a usable answer', () => {
    expect(parseTriviaReply('Q: Who?\nA) One\nB) Two\nANSWER: D')).toEqual([])
    expect(parseTriviaReply('Q: Who?\nA) One\nB) Two')).toEqual([])
    expect(parseTriviaReply('just chatting')).toEqual([])
  })
})
