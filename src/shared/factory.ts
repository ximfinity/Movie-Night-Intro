import { v4 as uuid } from 'uuid'
import type { CountdownConfig, MediaLibrary, ProjectData, SlideItem, VideoItem } from './types'

export function createDefaultCountdown(): CountdownConfig {
  return {
    enabled: true,
    label: 'The show starts in',
    completeLabel: 'Enjoy the show!',
    durationSec: 300,
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
    formatVersion: 2,
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

export function createSlideItem(): SlideItem {
  return {
    id: uuid(),
    type: 'slide',
    transition: 'crossfade',
    title: 'New Announcement',
    subtitle: '',
    theme: 'midnight',
    backgroundImage: null,
    backgroundImageDisplayName: null,
    textAnimation: 'fade-up',
    durationSec: 6,
    music: null
  }
}
