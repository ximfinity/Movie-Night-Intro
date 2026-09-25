import { v4 as uuid } from 'uuid'
import type {
  CountdownConfig,
  MediaLibrary,
  ProjectData,
  SlideFrame,
  SlideFrameContent,
  SlideshowItem,
  VideoItem
} from './types'
import { formatTimeOfDay } from './countdown'

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
    position: 'top-right'
  }
}

export function createEmptyLibrary(): MediaLibrary {
  return { videos: [], audio: [], images: [] }
}

export function createEmptyProject(name: string): ProjectData {
  const now = new Date().toISOString()
  return {
    formatVersion: 3,
    id: uuid(),
    name,
    createdAt: now,
    updatedAt: now,
    items: [],
    countdown: createDefaultCountdown(),
    library: createEmptyLibrary()
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

export function createSlideFrame(content: SlideFrameContent = 'text'): SlideFrame {
  return {
    id: uuid(),
    content,
    title: content === 'text' ? 'New Announcement' : '',
    subtitleOptions: [''],
    theme: 'midnight',
    textAnimation: 'fade-up',
    backgroundImage: null,
    backgroundImageDisplayName: null,
    durationSec: 6
  }
}

export function createSlideshowItem(): SlideshowItem {
  return {
    id: uuid(),
    type: 'slideshow',
    transition: 'crossfade',
    frames: [createSlideFrame('text')],
    music: null
  }
}
