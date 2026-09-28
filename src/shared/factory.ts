import { v4 as uuid } from 'uuid'
import type {
  AiPromptSettings,
  CountdownConfig,
  FeatureConfig,
  MediaLibrary,
  ProjectData,
  SlideFrame,
  SlideFrameContent,
  SlideshowItem,
  VideoItem
} from './types'
import { formatTimeOfDay } from './countdown'

/** The parts of a slide that make up its "look", carried over to new slides in a group. */
export type SlideStyle = Pick<SlideFrame, 'theme' | 'textAnimation' | 'durationSec'>

export const DEFAULT_SLIDE_STYLE: SlideStyle = {
  theme: 'midnight',
  textAnimation: 'fade-up',
  durationSec: 6
}

export function slideStyleOf(frame: SlideFrame): SlideStyle {
  return { theme: frame.theme, textAnimation: frame.textAnimation, durationSec: frame.durationSec }
}

export function createDefaultCountdown(): CountdownConfig {
  return {
    enabled: true,
    label: 'The show starts in',
    completeLabel: 'Enjoy the show!',
    mode: 'clock',
    durationSec: 300,
    targetTime: formatTimeOfDay(new Date(Date.now() + 5 * 60_000)),
    holdAtZeroSec: 3,
    style: 'ring',
    position: 'top-right',
    loopPlaylistUntilShowtime: false
  }
}

export function createDefaultAiPrompt(): AiPromptSettings {
  return { event: '', tone: 'silly and punny', perTitle: 5 }
}

export function createDefaultFeature(): FeatureConfig {
  return {
    source: 'none',
    filePath: '',
    player: 'builtin',
    subtitlePath: '',
    streamUrl: '',
    title: '',
    posterImage: null,
    startMode: 'manual',
    holdSec: 30,
    transition: 'bumper',
    introClip: null,
    holdMessage: 'The movie will be starting shortly',
    holdMusic: null,
    holdMusicVolume: 0.5,
    holdSlideGroupId: null,
    endMessage: 'Thanks for coming!',
    endSlideGroupId: null
  }
}

export function createEmptyLibrary(): MediaLibrary {
  return { videos: [], audio: [], images: [] }
}

export function createEmptyProject(name: string): ProjectData {
  const now = new Date().toISOString()
  return {
    formatVersion: 5,
    id: uuid(),
    name,
    createdAt: now,
    updatedAt: now,
    items: [],
    countdown: createDefaultCountdown(),
    library: createEmptyLibrary(),
    aiPrompt: createDefaultAiPrompt(),
    feature: createDefaultFeature()
  }
}

export function createVideoItem(fileName: string, displayName: string): VideoItem {
  return {
    id: uuid(),
    type: 'video',
    transition: 'crossfade',
    fileName,
    displayName,
    volume: 1
  }
}

export function createSlideFrame(
  content: SlideFrameContent = 'text',
  style: SlideStyle = DEFAULT_SLIDE_STYLE,
  title?: string
): SlideFrame {
  return {
    id: uuid(),
    content,
    title: title ?? (content === 'text' ? 'New Announcement' : ''),
    subtitleOptions: [''],
    ...style,
    backgroundImage: null,
    backgroundImageDisplayName: null,
    bodyStyle: 'rotate',
    aiKind: 'jokes'
  }
}

/** The untouched first slide a new group starts with — replaced rather than kept when a
 * quick build adds real slides. */
export function isPristineDefaultFrame(frame: SlideFrame): boolean {
  return (
    frame.content === 'text' &&
    frame.title === 'New Announcement' &&
    frame.subtitleOptions.every((s) => !s.trim()) &&
    !frame.backgroundImage
  )
}

export function createSlideshowItem(): SlideshowItem {
  return {
    id: uuid(),
    type: 'slideshow',
    name: '',
    transition: 'crossfade',
    frames: [createSlideFrame('text')],
    music: null
  }
}

/** Deep copy of a slide group with fresh ids throughout, so the copy can be edited (and
 * its slides reordered) independently of the original. */
export function cloneSlideshowItem(item: SlideshowItem): SlideshowItem {
  return {
    ...item,
    id: uuid(),
    frames: item.frames.map((f) => ({ ...f, id: uuid(), subtitleOptions: [...f.subtitleOptions] })),
    music: item.music ? { ...item.music } : null
  }
}

/** Whether a feature movie is set up, so the show hands off to it at showtime. */
export function hasFeatureMovie(feature: FeatureConfig): boolean {
  if (feature.source === 'file') return feature.filePath.trim() !== ''
  if (feature.source === 'stream') return feature.streamUrl.trim() !== ''
  return false
}
