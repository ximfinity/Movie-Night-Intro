import type { PlaylistItem } from '@shared/types'

export function itemIcon(type: PlaylistItem['type']): string {
  switch (type) {
    case 'video':
      return '🎬'
    case 'slide':
      return '📝'
  }
}

export function itemColorVar(type: PlaylistItem['type']): string {
  switch (type) {
    case 'video':
      return 'var(--video-color)'
    case 'slide':
      return 'var(--slide-color)'
  }
}

export function itemTitle(item: PlaylistItem): string {
  switch (item.type) {
    case 'video':
      return item.displayName || 'Video clip'
    case 'slide':
      return item.title || 'Untitled slide'
  }
}

export function itemSubtitle(item: PlaylistItem): string {
  switch (item.type) {
    case 'video':
      return `Video · volume ${Math.round(item.volume * 100)}%`
    case 'slide': {
      const bits = [`${item.durationSec}s`]
      if (item.music) bits.push('with music')
      if (item.backgroundImage) bits.push('with image')
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
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}
