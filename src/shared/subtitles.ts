/** Converts SubRip (.srt) subtitles to WebVTT, the only format the <video> element's
 * <track> accepts. Text that is already WebVTT is returned unchanged. */
export function toWebVtt(text: string): string {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  if (/^WEBVTT/.test(clean)) return clean
  const body = clean
    // "00:01:02,345 --> 00:01:04,000" → "00:01:02.345 --> 00:01:04.000"
    .replace(/(\d{1,2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    // Cue numbers on their own line before a timing line aren't needed (but are allowed as
    // identifiers); dropping them keeps the output tidy.
    .replace(/^\d+\n(?=\d{1,2}:\d{2}:\d{2}\.\d{3} -->)/gm, '')
  return `WEBVTT\n\n${body.trim()}\n`
}
