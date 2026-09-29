import type { SlideFrame, SlideshowItem } from '@shared/types'
import { SUBTITLE_MAX_CHARS } from '@shared/types'
import { isPristineDefaultFrame } from '@shared/factory'
import { buildSubtitlePrompt, normalizeTitleKey } from '@shared/aiPrompt'
import { useProject } from '../state/useProject'

/** Text slides in a group worth asking an AI about (titled, not the untouched
 * placeholder a new group starts with, and not a list such as a price menu). */
export function promptableFrames(item: SlideshowItem): SlideFrame[] {
  return item.frames.filter(
    (f) =>
      f.content === 'text' && f.bodyStyle !== 'list' && f.title.trim() && !isPristineDefaultFrame(f)
  )
}

type PromptBuilder = (item: SlideshowItem, onlyFrame?: SlideFrame, extraTitles?: string[]) => string

/** Builds the subtitle prompt for a group (or one slide), with the project's AI settings. */
export function useSubtitlePrompt(): PromptBuilder {
  const { project } = useProject()
  return (item, onlyFrame, extraTitles = []) => {
    const settings = project!.aiPrompt
    const frames = onlyFrame ? [onlyFrame] : promptableFrames(item)
    const known = new Set(frames.map((f) => normalizeTitleKey(f.title)))
    const titles = [
      ...frames.map((f) => ({
        title: f.title,
        existing: f.subtitleOptions,
        trivia: f.aiKind === 'trivia'
      })),
      ...extraTitles
        .filter((t) => !known.has(normalizeTitleKey(t)))
        .map((t) => ({ title: t, existing: [] }))
    ]
    return buildSubtitlePrompt({
      titles,
      event: settings.event,
      tone: settings.tone,
      perTitle: settings.perTitle,
      maxChars: SUBTITLE_MAX_CHARS
    })
  }
}

/** Builds the prompt for a group (or one slide) and copies it to the clipboard. */
export function usePromptCopier(): (
  item: SlideshowItem,
  onlyFrame?: SlideFrame,
  extraTitles?: string[]
) => void {
  const build = useSubtitlePrompt()
  return (item, onlyFrame, extraTitles = []) =>
    window.api.copyText(build(item, onlyFrame, extraTitles))
}
