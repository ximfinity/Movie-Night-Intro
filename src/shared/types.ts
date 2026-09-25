// Shared data model used by both the main process (file I/O) and the renderer (UI).

export type MediaKind = 'video' | 'audio' | 'image'

export type TransitionStyle = 'crossfade' | 'slide-left' | 'slide-up' | 'zoom' | 'none'

export type SlideTheme = 'midnight' | 'sunset' | 'popcorn' | 'classic'

export type TextAnimation = 'fade-up' | 'typewriter' | 'zoom-in' | 'slide-in'

export type CountdownStyle = 'flip' | 'ring' | 'pulse'

export type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'

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
  type: 'video' | 'slide'
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

export type PlaylistItem = VideoItem | SlideItem

/** Show-wide countdown, rendered as a persistent overlay on top of whatever is playing
 * (rather than occupying a slot in the playlist), from the start of the show until it completes. */
export type CountdownMode = 'duration' | 'clock'

export interface CountdownConfig {
  enabled: boolean
  label: string
  completeLabel: string
  /** 'duration' counts down a fixed length from whenever the show starts (resets on
   * restart). 'clock' counts down to an absolute time of day, computed from the wall
   * clock, so it stays correct no matter how many times the show is stopped/restarted. */
  mode: CountdownMode
  durationSec: number
  /** Local time of day in 24-hour "HH:mm" form, used when mode is 'clock'. */
  targetTime: string
  holdAtZeroSec: number
  style: CountdownStyle
  position: OverlayPosition
}

export interface ImportedMediaFile {
  fileName: string
  displayName: string
}

/** Media imported ahead of time so it can be reused across multiple items without
 * re-opening a file picker each time (e.g. the same music track on several slides). */
export interface MediaLibrary {
  videos: ImportedMediaFile[]
  audio: ImportedMediaFile[]
  images: ImportedMediaFile[]
}

export interface ProjectData {
  formatVersion: 2
  id: string
  name: string
  createdAt: string
  updatedAt: string
  items: PlaylistItem[]
  countdown: CountdownConfig
  library: MediaLibrary
}

export interface OpenProjectResult {
  dir: string
  project: ProjectData
}
