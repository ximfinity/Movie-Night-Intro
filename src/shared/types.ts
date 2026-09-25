// Shared data model used by both the main process (file I/O) and the renderer (UI).

export type MediaKind = 'video' | 'audio' | 'image'

export type TransitionStyle = 'crossfade' | 'slide-left' | 'slide-up' | 'zoom' | 'none'

export type SlideTheme = 'midnight' | 'sunset' | 'popcorn' | 'classic'

export type TextAnimation = 'fade-up' | 'typewriter' | 'zoom-in' | 'slide-in'

export type CountdownStyle = 'flip' | 'ring' | 'pulse'

export interface SlideMusic {
  fileName: string
  displayName: string
  volume: number
  fadeInSec: number
  fadeOutSec: number
  /** If true, playback continues into the next item instead of stopping/fading out here. */
  continueToNext: boolean
}

export interface BaseItem {
  id: string
  type: 'video' | 'slide' | 'countdown'
  /** Transition used when this item enters (transitioning away from the previous item). */
  transition: TransitionStyle
}

export interface VideoItem extends BaseItem {
  type: 'video'
  fileName: string
  displayName: string
  volume: number
}

export interface SlideItem extends BaseItem {
  type: 'slide'
  title: string
  subtitle: string
  theme: SlideTheme
  backgroundImage: string | null
  backgroundImageDisplayName: string | null
  textAnimation: TextAnimation
  durationSec: number
  music: SlideMusic | null
}

export interface CountdownItem extends BaseItem {
  type: 'countdown'
  label: string
  completeLabel: string
  durationSec: number
  holdAtZeroSec: number
  style: CountdownStyle
}

export type PlaylistItem = VideoItem | SlideItem | CountdownItem

export interface ProjectData {
  formatVersion: 1
  id: string
  name: string
  createdAt: string
  updatedAt: string
  items: PlaylistItem[]
}

export interface ImportedMediaFile {
  fileName: string
  displayName: string
}

export interface OpenProjectResult {
  dir: string
  project: ProjectData
}
