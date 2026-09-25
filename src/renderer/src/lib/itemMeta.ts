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
