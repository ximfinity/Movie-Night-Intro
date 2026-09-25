// Shared data model used by both the main process (file I/O) and the renderer (UI).

export type MediaKind = 'video' | 'audio' | 'image'

export type TransitionStyle = 'crossfade' | 'slide-left' | 'slide-up' | 'zoom' | 'none'

/** A theme id from shared/slideThemes.ts, or the 'random' sentinel meaning "pick one of
 * the 20 palette themes at random each time this frame is shown". */
export type SlideTheme = string

export type TextAnimation = 'fade-up' | 'typewriter' | 'zoom-in' | 'slide-in'

export type CountdownStyle = 'flip' | 'ring' | 'pulse'

export type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'

export type SlideMusicKind = 'audio' | 'video'

export interface SlideMusic {
  /** 'audio' plays as a plain background track. 'video' plays the clip's picture too,
   * as a small pop-up-video-style overlay in one corner of the screen. */
  kind: SlideMusicKind
  fileName: string
  displayName: string
  volume: number
  fadeInSec: number
  fadeOutSec: number
  /** Only meaningful when kind is 'video'. */
  position: OverlayPosition
  /** Only meaningful when kind is 'video': size multiplier over the base 260x170 pop-up
   * box (e.g. 3 = 780x510). */
  sizeScale: number
  /** Only meaningful when kind is 'video': keep rotating the slideshow's slides in a loop
   * for as long as the video plays, advancing to the next playlist item only when the
   * video itself ends, instead of after one pass through the slides. */
  loopSlidesUntilEnd: boolean
}

export type SlideFrameContent = 'text' | 'image'

/** One frame within a Slideshow item. Frames rotate automatically, each for its own
 * duration, while the slideshow's single shared music track keeps playing underneath. */
export interface SlideFrame {
  id: string
  content: SlideFrameContent
  title: string
  /** Body text variants for this frame. When there's more than one, a single option is
   * picked at random each time the frame is shown, while the title stays fixed. */
  subtitleOptions: string[]
  theme: SlideTheme
  textAnimation: TextAnimation
  /** Background for a text frame, or the full-bleed picture for an image frame. */
  backgroundImage: string | null
  backgroundImageDisplayName: string | null
  durationSec: number
}

export interface BaseItem {
  id: string
  type: 'video' | 'slideshow'
  /** Transition used when this item enters (transitioning away from the previous item),
   * and reused between frames when a slideshow item rotates. */
  transition: TransitionStyle
}

export interface VideoItem extends BaseItem {
  type: 'video'
  fileName: string
  displayName: string
  volume: number
}

export interface SlideshowItem extends BaseItem {
  type: 'slideshow'
  frames: SlideFrame[]
  /** Plays once for the whole rotation, from the moment the slideshow starts until it
   * ends — not tied to any single frame. */
  music: SlideMusic | null
}

export type PlaylistItem = VideoItem | SlideshowItem

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
  formatVersion: 3
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
