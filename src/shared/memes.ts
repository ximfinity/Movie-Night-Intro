// Meme slides: classic top/bottom captions over a picture, rendered into an image slide.

export interface MemeCaption {
  top: string
  bottom: string
}

/** Ready-made captions for when no AI is connected. */
export const BUILTIN_MEME_CAPTIONS: MemeCaption[] = [
  { top: 'One does not simply', bottom: 'Watch a movie without snacks' },
  { top: 'Me: I will not eat all the popcorn', bottom: 'Also me: before the trailers end' },
  { top: 'When someone talks during the movie', bottom: 'Shhhhhhhhhh' },
  { top: 'Phone on silent', bottom: 'Popcorn on loud' },
  { top: 'Nobody:', bottom: 'Me explaining the plot I just spoiled' },
  { top: "I'm not saying it's the best seat", bottom: "But it's the best seat" },
  { top: 'Brace yourselves', bottom: 'Movie night is coming' },
  { top: 'Keep calm', bottom: 'And pass the popcorn' },
  { top: 'Did someone say', bottom: 'Free refills?' },
  { top: 'Bathroom break?', bottom: 'Now or never' }
]

export function buildMemeCaptionPrompt(opts: {
  context: string
  event: string
  tone: string
  count: number
}): string {
  return [
    'Write short, funny captions for classic two-line memes (top text and bottom text) to show on a big screen before a movie.',
    '',
    `Event: ${opts.event.trim() || 'A family movie night'}`,
    `Tone: ${opts.tone.trim() || 'silly and punny'}`,
    opts.context.trim() ? `Topics to riff on: ${opts.context.trim()}` : '',
    '',
    'Rules:',
    '- Family-friendly for all ages.',
    '- Each line at most 40 characters.',
    "- No spoilers about tonight's movie. No hashtags or emojis.",
    '',
    `Reply with exactly ${opts.count} captions, one per line, in this format:`,
    'TOP: first line | BOTTOM: second line'
  ]
    .filter((l, i, all) => l !== '' || all[i - 1] !== '')
    .join('\n')
}

/** Reads "TOP: … | BOTTOM: …" lines (tolerating bullets, quotes and "top / bottom"). */
export function parseMemeCaptions(text: string): MemeCaption[] {
  const out: MemeCaption[] = []
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw
      .trim()
      .replace(/^(?:[-*•]+|\d{1,2}[.)])\s*/, '')
      .replace(/\*\*/g, '')
    if (!line || line.startsWith('```')) continue
    const tagged = line.match(/top\s*:\s*(.*?)\s*[|/]\s*bottom\s*:\s*(.*)$/i)
    const plain = tagged ? null : line.match(/^(.+?)\s+[|/]\s+(.+)$/)
    const m = tagged ?? plain
    if (!m) continue
    const clean = (s: string): string =>
      s
        .trim()
        .replace(/^["“']+|["”']+$/g, '')
        .trim()
    const caption = { top: clean(m[1]), bottom: clean(m[2]) }
    if (caption.top || caption.bottom) out.push(caption)
  }
  return out
}

/** Prompt for an AI picture: no lettering (the app adds the captions), wide framing. */
export function buildMemeImagePrompt(description: string): string {
  return [
    description.trim(),
    'Funny, family-friendly, bright cartoon illustration, wide 16:9 composition.',
    'Leave the top and bottom of the picture free of important details (captions go there).',
    'Do not include any text, letters or logos in the image.'
  ].join(' ')
}
