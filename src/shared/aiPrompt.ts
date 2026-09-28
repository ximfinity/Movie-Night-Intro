/** Copy-and-paste AI workflow for slide subtitles: build a prompt the user pastes into any
 * AI chat (ChatGPT, Claude, Gemini…), then read back whatever the chat replies. No API key
 * or network access involved — the app only ever sees text the user pasted. */

export interface PromptTitle {
  title: string
  /** Subtitles the slide already has, so the AI doesn't repeat them. */
  existing: string[]
  /** Ask for true fun facts about tonight's movie instead of jokes. */
  trivia?: boolean
}

export interface PromptOptions {
  titles: PromptTitle[]
  event: string
  tone: string
  perTitle: number
  maxChars: number
}

export function buildSubtitlePrompt(opts: PromptOptions): string {
  const titles = opts.titles.map((t) => t.title.trim()).filter(Boolean)
  const used = [
    ...new Set(opts.titles.flatMap((t) => t.existing.map((s) => s.trim())).filter(Boolean))
  ]
  const triviaTitles = opts.titles
    .filter((t) => t.trivia && t.title.trim())
    .map((t) => t.title.trim())
  const exampleTitles = titles.length > 0 ? titles.slice(0, 2) : ['Silence Your Phones']
  const example = exampleTitles
    .map((t) => `TITLE: ${t}\nfirst subtitle\nsecond subtitle`)
    .join('\n\n')

  return [
    'You are writing on-screen text for a pre-show slideshow at a family movie night.',
    '',
    'Each slide has a fixed title. Under the title, one short, silly subtitle appears, picked at random each time the slide is shown. Write subtitles for every title listed below.',
    '',
    `Event: ${opts.event.trim() || 'A family movie night'}`,
    `Tone: ${opts.tone.trim() || 'silly and punny'}`,
    `Subtitles per title: ${opts.perTitle}`,
    '',
    ...titles.map((t) => `TITLE: ${t}`),
    '',
    'Rules:',
    '- Family-friendly for all ages: no insults, innuendo, swearing or scary content.',
    `- At most ${opts.maxChars} characters each, so it fits on one line on screen.`,
    '- Each subtitle must make sense on its own under its title.',
    '- Mix the joke styles: puns, over-the-top exaggeration, fake official rules, absurd consequences.',
    `- Don't reuse the title's wording, and don't repeat anything under "Already used".`,
    '- No emojis, hashtags, numbering, bullets or quotation marks.',
    "- No spoilers about tonight's movie.",
    ...(triviaTitles.length > 0
      ? [
          '',
          "These titles are trivia slides: instead of jokes, write true, verifiable fun facts about tonight's movie (behind the scenes, the cast, how it was made), same length limit, no plot spoilers:",
          ...triviaTitles.map((t) => `TITLE: ${t}`)
        ]
      : []),
    '',
    'Already used (do not repeat):',
    ...(used.length > 0 ? used : ['none']),
    '',
    'Reply with ONLY one code block in exactly this format, with a blank line between titles:',
    '',
    '```',
    example,
    '```'
  ].join('\n')
}

export interface ReplySection {
  /** null for lines that came before any TITLE: line (or a reply with no titles at all). */
  title: string | null
  lines: string[]
}

const FENCE = /^\s*(```|~~~)/
const TITLE_LINE = /^[\s>#*_-]*title\s*[:：]\s*(.+?)[\s*_]*$/i

/** Strips list markers, numbering, quotes and markdown emphasis an AI chat tends to add. */
export function cleanLine(raw: string): string {
  let s = raw.trim()
  s = s.replace(/^(?:[-*•·–—>]+|\(?\d{1,3}[.)\]:])\s+/, '')
  s = s.replace(/^\*\*(.+)\*\*$/, '$1').replace(/^__(.+)__$/, '$1')
  s = s.replace(/^["'“‘`]+(.*?)["'”’`]+$/, '$1')
  return s.trim()
}

/** Reads an AI chat's reply. Uses only the contents of code blocks when there are any
 * (the chat's one-click Copy button copies just those), otherwise every line; groups lines
 * under `TITLE:` lines; drops blank lines and chatter such as "Here you go:". */
export function parseAiReply(text: string): ReplySection[] {
  const allLines = text.replace(/\r\n?/g, '\n').split('\n')
  let lines = allLines
  if (allLines.some((l) => FENCE.test(l))) {
    lines = []
    let inside = false
    for (const l of allLines) {
      if (FENCE.test(l)) inside = !inside
      else if (inside) lines.push(l)
    }
  }

  const sections: ReplySection[] = []
  let current: ReplySection | null = null
  for (const raw of lines) {
    const titleMatch = raw.match(TITLE_LINE)
    if (titleMatch) {
      current = { title: cleanLine(titleMatch[1]), lines: [] }
      sections.push(current)
      continue
    }
    const line = cleanLine(raw)
    if (!line || /:$/.test(line)) continue
    if (!current) {
      current = { title: null, lines: [] }
      sections.push(current)
    }
    current.lines.push(line)
  }
  // Intro chatter before the first TITLE: is never subtitles when titles are present.
  if (sections.length > 1 && sections[0].title === null) sections.shift()
  return sections.filter((s) => s.title !== null || s.lines.length > 0)
}

export function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[“”"'‘’`!?.…,:;]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface PlanTarget {
  id: string
  title: string
  existing: string[]
}

export interface PlanEntry {
  /** Existing slide to add to, or undefined to create a new slide titled `title`. */
  frameId?: string
  title: string
  lines: string[]
  /** Lines dropped because the slide already has them (or they repeated in the reply). */
  duplicates: number
}

/** Matches reply sections to slides by title (ignoring case and punctuation), creating new
 * slides for unknown titles, and sends untitled lines to `untitledTargetId`. Lines the slide
 * already has, or that repeat within the reply, are dropped. */
export function planSubtitleImport(
  sections: ReplySection[],
  targets: PlanTarget[],
  untitledTargetId: string | null,
  /** Titles the user typed for slides that don't exist yet: a new slide matching one of
   * these keeps the user's spelling rather than the AI's. */
  pendingTitles: string[] = []
): PlanEntry[] {
  const byKey = new Map(targets.map((t) => [normalizeTitleKey(t.title), t]))
  const pendingByKey = new Map(pendingTitles.map((t) => [normalizeTitleKey(t), t.trim()]))
  const entries = new Map<string, PlanEntry & { seen: Set<string> }>()

  for (const section of sections) {
    let target: PlanTarget | undefined
    let entryKey: string
    if (section.title === null) {
      target = targets.find((t) => t.id === untitledTargetId)
      if (!target) continue
      entryKey = `id:${target.id}`
    } else {
      target = byKey.get(normalizeTitleKey(section.title))
      entryKey = target ? `id:${target.id}` : `new:${normalizeTitleKey(section.title)}`
    }
    let entry = entries.get(entryKey)
    if (!entry) {
      entry = {
        frameId: target?.id,
        title:
          target?.title ??
          (section.title !== null
            ? (pendingByKey.get(normalizeTitleKey(section.title)) ?? section.title)
            : ''),
        lines: [],
        duplicates: 0,
        seen: new Set((target?.existing ?? []).map((s) => s.trim().toLowerCase()))
      }
      entries.set(entryKey, entry)
    }
    for (const line of section.lines) {
      const k = line.trim().toLowerCase()
      if (entry.seen.has(k)) {
        entry.duplicates++
        continue
      }
      entry.seen.add(k)
      entry.lines.push(line)
    }
  }

  return [...entries.values()].map((e) => ({
    frameId: e.frameId,
    title: e.title,
    lines: e.lines,
    duplicates: e.duplicates
  }))
}
