import { v4 as uuid } from 'uuid'
import type {
  AiPromptSettings,
  CountdownConfig,
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

export function createEmptyLibrary(): MediaLibrary {
  return { videos: [], audio: [], images: [] }
}

export function createEmptyProject(name: string): ProjectData {
  const now = new Date().toISOString()
  return {
    formatVersion: 4,
    id: uuid(),
    name,
    createdAt: now,
    updatedAt: now,
    items: [],
    countdown: createDefaultCountdown(),
    library: createEmptyLibrary(),
    aiPrompt: createDefaultAiPrompt()
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
    backgroundImageDisplayName: null
  }
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
