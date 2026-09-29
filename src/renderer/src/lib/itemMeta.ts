import type { PlaylistItem, SlideFrame, SlideshowItem } from '@shared/types'
import { parseTimeOfDay } from '@shared/countdown'

export function itemIcon(type: PlaylistItem['type']): string {
  switch (type) {
    case 'video':
      return '🎬'
    case 'slideshow':
      return '📝'
  }
}

export function itemColorVar(type: PlaylistItem['type']): string {
  switch (type) {
    case 'video':
      return 'var(--video-color)'
    case 'slideshow':
      return 'var(--slide-color)'
  }
}

/** What a slide group is called when it has no name of its own. */
export function autoGroupName(item: SlideshowItem): string {
  const first = item.frames[0]
  if (item.frames.length === 1 && first) {
    return first.content === 'image'
      ? first.backgroundImageDisplayName || 'Image slide'
      : first.title || 'Untitled slide'
  }
  return `Slide group · ${item.frames.length} slides`
}

export function itemTitle(item: PlaylistItem): string {
  switch (item.type) {
    case 'video':
      return item.displayName || 'Video clip'
    case 'slideshow':
      return item.name.trim() || autoGroupName(item)
  }
}

export function itemTypeLabel(item: PlaylistItem): string {
  return item.type === 'video' ? 'Video clip' : 'Slide group'
}

/** One-line summary of a slide for the collapsed slide list. */
export function frameLabel(frame: SlideFrame): string {
  if (frame.content === 'image')
    return frame.backgroundImageDisplayName || 'Image slide (no image yet)'
  return frame.title.trim() || 'Untitled slide'
}

export function itemSubtitle(item: PlaylistItem): string {
  switch (item.type) {
    case 'video':
      return `Video · volume ${Math.round(item.volume * 100)}%`
    case 'slideshow': {
      const totalSec = item.frames.reduce((sum, f) => sum + f.durationSec, 0)
      const bits = [`${totalSec}s`]
      if (item.music) bits.push('with music')
      if (item.frames.some((f) => f.backgroundImage)) bits.push('with image')
      return bits.join(' · ')
    }
  }
}

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = Math.round(totalSeconds % 60)
  if (m === 0) return `${s}s`
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Formats a stored 24-hour "HH:mm" as a friendly 12-hour clock label, e.g. "7:30 PM". */
export function formatClockLabel(hhmm: string): string {
  const parsed = parseTimeOfDay(hhmm)
  if (!parsed) return 'no time set'
  const [h, m] = parsed
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}
