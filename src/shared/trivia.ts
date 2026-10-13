// Trivia rounds: question limits, a fresh item, built-in starter questions, and the
// copy-and-paste / direct AI prompt for writing more. Pure data + text (no I/O).
import { v4 as uuid } from 'uuid'
import type { TriviaItem, TriviaQuestion } from './types'

export const TRIVIA_LETTERS = ['A', 'B', 'C', 'D'] as const
export const MIN_CHOICES = 2
export const MAX_CHOICES = 4
export const QUESTION_MAX_CHARS = 120
export const CHOICE_MAX_CHARS = 48
export const NOTE_MAX_CHARS = 110

export function createTriviaQuestion(patch: Partial<TriviaQuestion> = {}): TriviaQuestion {
  return { id: uuid(), question: '', choices: ['', '', '', ''], answer: 0, note: '', ...patch }
}

export function createTriviaItem(questions: TriviaQuestion[] = []): TriviaItem {
  return {
    id: uuid(),
    type: 'trivia',
    name: '',
    transition: 'crossfade',
    questions: questions.length > 0 ? questions : [createTriviaQuestion()],
    theme: 'midnight',
    questionSec: 15,
    answerSec: 8,
    music: null
  }
}

/** Deep copy with fresh ids, so a duplicate can be edited on its own. */
export function cloneTriviaItem(item: TriviaItem): TriviaItem {
  return {
    ...item,
    id: uuid(),
    questions: item.questions.map((q) => ({ ...q, id: uuid(), choices: [...q.choices] }))
  }
}

/** A question ready for the show: a question, at least two filled-in choices, and an
 * answer that points at one of them. */
export function isPlayableQuestion(q: TriviaQuestion): boolean {
  const filled = q.choices.filter((c) => c.trim()).length
  return (
    q.question.trim() !== '' && filled >= MIN_CHOICES && (q.choices[q.answer] ?? '').trim() !== ''
  )
}

/** The question as it plays: blank choices dropped and the answer index moved to match. */
export function playableChoices(q: TriviaQuestion): { choices: string[]; answer: number } {
  const kept: string[] = []
  let answer = 0
  q.choices.forEach((c, i) => {
    if (!c.trim()) return
    if (i === q.answer) answer = kept.length
    kept.push(c.trim())
  })
  return { choices: kept, answer }
}

// ---------------------------------------------------------------------------------------
// Built-in starter questions (true, family-friendly, about well-known movies).

type Starter = [question: string, choices: string[], answer: number, note: string]

const GENERAL: Starter[] = [
  [
    'What kind of fish is Nemo?',
    ['Goldfish', 'Clownfish', 'Angelfish', 'Pufferfish'],
    1,
    'Real clownfish live among sea anemones, just like Nemo.'
  ],
  [
    'In Toy Story, what is the cowboy called?',
    ['Buzz', 'Rex', 'Woody', 'Slinky'],
    2,
    'Toy Story (1995) was the first fully computer-animated feature film.'
  ],
  [
    'What is the name of the snowman in Frozen?',
    ['Olaf', 'Sven', 'Kristoff', 'Hans'],
    0,
    "Sven is Kristoff's reindeer."
  ],
  [
    "What does 'Hakuna Matata' mean in The Lion King?",
    ['Good morning', 'No worries', "Let's eat", 'Be brave'],
    1,
    "It's a Swahili phrase."
  ],
  [
    "Which was Disney's first full-length animated movie?",
    ['Cinderella', 'Pinocchio', 'Snow White and the Seven Dwarfs', 'Bambi'],
    2,
    'It premiered in 1937.'
  ],
  [
    "Who voiced the Genie in Disney's 1992 Aladdin?",
    ['Eddie Murphy', 'Robin Williams', 'Jim Carrey', 'Will Smith'],
    1,
    'Will Smith played the Genie in the 2019 remake.'
  ]
]

const HALLOWEEN: Starter[] = [
  [
    'In Ghostbusters (1984), what giant figure stomps through New York?',
    ['Godzilla', 'The Stay Puft Marshmallow Man', 'King Kong', 'A giant pumpkin'],
    1,
    'Ray thought of the most harmless thing he could… and it came to life.'
  ],
  [
    "What is the name of Jack Skellington's ghost dog?",
    ['Zero', 'Scraps', 'Spooky', 'Bones'],
    0,
    'His glowing nose is a tiny jack-o’-lantern.'
  ],
  [
    'In Hocus Pocus, how many Sanderson sisters are there?',
    ['Two', 'Three', 'Four', 'Five'],
    1,
    'Winifred, Mary and Sarah.'
  ],
  [
    'In Monsters, Inc., what powers Monstropolis at the start?',
    ["Kids' screams", 'Laughter', 'Candy', 'Lightning'],
    0,
    'By the end, they find laughter works even better.'
  ]
]

const CHRISTMAS: Starter[] = [
  [
    'In Home Alone, where is the McCallister family flying to?',
    ['London', 'Paris', 'Rome', 'New York'],
    1,
    'Kevin is left behind in Chicago.'
  ],
  [
    'In Elf, what does Buddy pour on his spaghetti?',
    ['Chocolate sauce', 'Ketchup', 'Maple syrup', 'Sprinkles'],
    2,
    'Elves stick to the four main food groups: candy, candy canes, candy corn and syrup.'
  ],
  [
    "What is the name of the Grinch's dog?",
    ['Max', 'Buddy', 'Rex', 'Spot'],
    0,
    'Max gets a reindeer antler tied to his head.'
  ],
  [
    'What brings Frosty the Snowman to life?',
    ['A carrot nose', 'A magic hat', 'A snowflake', 'A song'],
    1,
    'The hat belonged to a magician.'
  ]
]

/** Starter questions for a theme night (Halloween and Christmas get their own). */
export function starterQuestions(theme: string = 'classic'): TriviaQuestion[] {
  const set = theme === 'halloween' ? HALLOWEEN : theme === 'christmas' ? CHRISTMAS : GENERAL
  return set.map(([question, choices, answer, note]) =>
    createTriviaQuestion({ question, choices: [...choices], answer, note })
  )
}

// ---------------------------------------------------------------------------------------
// AI prompt and reply

export interface TriviaPromptOptions {
  movie: string
  event: string
  count: number
  /** Questions the round already has, so the AI doesn't repeat them. */
  existing: string[]
}

export function buildTriviaPrompt(opts: TriviaPromptOptions): string {
  const movie = opts.movie.trim()
  const used = [...new Set(opts.existing.map((q) => q.trim()).filter(Boolean))].slice(-60)
  return [
    'You are writing a multiple-choice trivia round shown on screen before a family movie night.',
    '',
    `Event: ${opts.event.trim() || 'A family movie night'}`,
    movie
      ? `Topic: tonight's movie, ${movie} (behind the scenes, the cast, how it was made, the world it is set in), plus a few about family movies in general.`
      : 'Topic: well-known family movies.',
    `Number of questions: ${opts.count}`,
    '',
    'Rules:',
    '- Every question and answer must be true and checkable. If you are not sure of a fact, leave that question out.',
    '- Family-friendly for all ages. No plot spoilers about tonight’s movie.',
    `- Questions at most ${QUESTION_MAX_CHARS} characters; each choice at most ${CHOICE_MAX_CHARS}.`,
    '- Exactly 4 choices, one clearly right, the others believable but wrong. Vary which letter is right.',
    `- Add a short fun fact (at most ${NOTE_MAX_CHARS} characters) to show with the answer.`,
    '- No emojis.',
    '',
    'Already asked (do not repeat):',
    ...(used.length > 0 ? used : ['none']),
    '',
    'Reply with ONLY one code block in exactly this format, with a blank line between questions:',
    '',
    '```',
    'Q: In Toy Story, what is the cowboy called?',
    'A) Buzz',
    'B) Rex',
    'C) Woody',
    'D) Slinky',
    'ANSWER: C',
    'FACT: Toy Story was the first fully computer-animated feature film.',
    '```'
  ].join('\n')
}

const Q_LINE = /^(?:\*\*)?\s*(?:q(?:uestion)?\s*\d*|\d{1,2})\s*[:.)]\s*(.+?)\s*(?:\*\*)?$/i
const CHOICE_LINE = /^[\s*-]*\(?([a-d])[).:]\s*(.+?)\s*$/i
const ANSWER_LINE = /^[\s*_]*(?:correct\s+)?answer[\s*_]*[:：-][\s*_]*\(?([a-d])\b/i
const FACT_LINE = /^[\s*_]*(?:fun\s+)?(?:fact|note)[\s*_]*[:：-]\s*(.+?)\s*$/i

function clip(s: string, max: number): string {
  const t = s.trim().replace(/^["“]|["”]$/g, '')
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t
}

/** Reads questions back from whatever an AI chat replied: "Q:" lines, "A)"–"D)" choices,
 * "ANSWER: C" and an optional "FACT:". Tolerates code fences, numbering and markdown. A
 * question without a usable answer is dropped. */
export function parseTriviaReply(text: string): TriviaQuestion[] {
  const out: TriviaQuestion[] = []
  let cur: { question: string; choices: string[]; answer: number; note: string } | null = null
  const flush = (): void => {
    if (!cur) return
    const choices = cur.choices.slice(0, MAX_CHOICES)
    if (
      cur.question &&
      choices.length >= MIN_CHOICES &&
      cur.answer >= 0 &&
      cur.answer < choices.length
    ) {
      while (choices.length < MAX_CHOICES) choices.push('')
      out.push(createTriviaQuestion({ ...cur, choices }))
    }
    cur = null
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || /^(```|~~~)/.test(line)) continue
    const answer = ANSWER_LINE.exec(line)
    if (answer && cur) {
      cur.answer = 'abcd'.indexOf(answer[1].toLowerCase())
      continue
    }
    const fact = FACT_LINE.exec(line)
    if (fact && cur) {
      cur.note = clip(fact[1], NOTE_MAX_CHARS)
      continue
    }
    const choice = CHOICE_LINE.exec(line)
    if (choice && cur) {
      const idx = 'abcd'.indexOf(choice[1].toLowerCase())
      if (idx === cur.choices.length) cur.choices.push(clip(choice[2], CHOICE_MAX_CHARS))
      continue
    }
    const q = Q_LINE.exec(line)
    if (q) {
      flush()
      cur = { question: clip(q[1], QUESTION_MAX_CHARS), choices: [], answer: -1, note: '' }
    }
  }
  flush()
  return out
}
