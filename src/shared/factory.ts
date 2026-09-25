import { v4 as uuid } from 'uuid'
import type { CountdownItem, ProjectData, SlideItem, VideoItem } from './types'

export function createEmptyProject(name: string): ProjectData {
  const now = new Date().toISOString()
  return {
    formatVersion: 1,
    id: uuid(),
    name,
    createdAt: now,
    updatedAt: now,
    items: []
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

export function createCountdownItem(): CountdownItem {
  return {
    id: uuid(),
    type: 'countdown',
    transition: 'crossfade',
    label: 'The show starts in',
    completeLabel: 'Enjoy the show!',
    durationSec: 300,
    holdAtZeroSec: 3,
    style: 'ring'
  }
}
