import type { SlideFrame, SlideshowItem } from '@shared/types'
import { SUBTITLE_MAX_CHARS } from '@shared/types'
import { isPristineDefaultFrame } from '@shared/factory'
import { buildSubtitlePrompt, normalizeTitleKey } from '@shared/aiPrompt'
import { useProject } from '../state/useProject'

/** Text slides in a group worth asking an AI about (titled, and not the untouched
 * placeholder a new group starts with). */
export function promptableFrames(item: SlideshowItem): SlideFrame[] {
  return item.frames.filter(
    (f) => f.content === 'text' && f.title.trim() && !isPristineDefaultFrame(f)
  )
}

/** Builds the prompt for a group (or one slide) and copies it to the clipboard. */
export function usePromptCopier(): (
  item: SlideshowItem,
  onlyFrame?: SlideFrame,
  extraTitles?: string[]
) => void {
  const { project } = useProject()
  return (item, onlyFrame, extraTitles = []) => {
    const settings = project!.aiPrompt
    const frames = onlyFrame ? [onlyFrame] : promptableFrames(item)
    const known = new Set(frames.map((f) => normalizeTitleKey(f.title)))
    const titles = [
      ...frames.map((f) => ({ title: f.title, existing: f.subtitleOptions })),
      ...extraTitles
        .filter((t) => !known.has(normalizeTitleKey(t)))
        .map((t) => ({ title: t, existing: [] }))
    ]
    window.api.copyText(
      buildSubtitlePrompt({
        titles,
        event: settings.event,
        tone: settings.tone,
        perTitle: settings.perTitle,
        maxChars: SUBTITLE_MAX_CHARS
      })
    )
  }
}
