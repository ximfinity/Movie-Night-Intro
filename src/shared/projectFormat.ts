import { v4 as uuid } from 'uuid'
import type {
  ImportedMediaFile,
  MediaKind,
  MediaLibrary,
  MediaRef,
  OverlayPosition,
  PlaylistItem,
  ProjectData,
  SlideFrame,
  SlideMusic,
  SlideshowItem,
  TextAnimation,
  TransitionStyle,
  VideoItem
} from './types'
import {
  createDefaultAiPrompt,
  createDefaultCountdown,
  createSlideFrame,
  DEFAULT_SLIDE_STYLE
} from './factory'

type Raw = Record<string, unknown>

const TRANSITIONS: TransitionStyle[] = ['crossfade', 'slide-left', 'slide-up', 'zoom', 'none']
const ANIMATIONS: TextAnimation[] = ['fade-up', 'typewriter', 'zoom-in', 'slide-in']
const POSITIONS: OverlayPosition[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'center'
]

function isObj(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback
}
function num(v: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
}
function oneOf<T extends string>(v: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback
}

function normalizeSlideFrame(raw: Raw): SlideFrame {
  // Older files stored a single `subtitle` string instead of random variants.
  const subtitleOptions = Array.isArray(raw.subtitleOptions)
    ? raw.subtitleOptions.filter((s): s is string => typeof s === 'string')
    : typeof raw.subtitle === 'string' && raw.subtitle
      ? [raw.subtitle]
      : []
  const bg =
    typeof raw.backgroundImage === 'string' && raw.backgroundImage ? raw.backgroundImage : null
  return {
    id: str(raw.id, '') || uuid(),
    content: raw.content === 'image' ? 'image' : 'text',
    title: str(raw.title, ''),
    subtitleOptions: subtitleOptions.length > 0 ? subtitleOptions : [''],
    theme: str(raw.theme, DEFAULT_SLIDE_STYLE.theme),
    textAnimation: oneOf(raw.textAnimation, ANIMATIONS, DEFAULT_SLIDE_STYLE.textAnimation),
    backgroundImage: bg,
    backgroundImageDisplayName: bg ? str(raw.backgroundImageDisplayName, bg) : null,
    durationSec: num(raw.durationSec, DEFAULT_SLIDE_STYLE.durationSec, 1, 120)
  }
}

function normalizeSlideMusic(raw: unknown): SlideMusic | null {
  if (!isObj(raw) || typeof raw.fileName !== 'string' || !raw.fileName) return null
  return {
    kind: raw.kind === 'video' ? 'video' : 'audio',
    fileName: raw.fileName,
    displayName: str(raw.displayName, raw.fileName),
    volume: num(raw.volume, 0.8, 0, 1),
    fadeInSec: num(raw.fadeInSec, 1.5, 0, 30),
    fadeOutSec: num(raw.fadeOutSec, 1.5, 0, 30),
    position: oneOf(raw.position, POSITIONS, 'bottom-left'),
    sizeScale: num(raw.sizeScale, 3, 0.5, 10),
    loopSlidesUntilEnd: raw.loopSlidesUntilEnd === true
  }
}

function normalizeSlideshow(raw: Raw, frames: SlideFrame[]): SlideshowItem {
  // Frame ids must be unique within a group (they key drag-and-drop and React lists).
  const seen = new Set<string>()
  const uniqueFrames = frames.map((f) => {
    if (seen.has(f.id)) f = { ...f, id: uuid() }
    seen.add(f.id)
    return f
  })
  return {
    id: str(raw.id, '') || uuid(),
    type: 'slideshow',
    name: str(raw.name, ''),
    transition: oneOf(raw.transition, TRANSITIONS, 'crossfade'),
    frames: uniqueFrames.length > 0 ? uniqueFrames : [createSlideFrame('text')],
    music: normalizeSlideMusic(raw.music)
  }
}

export function normalizeItem(raw: unknown): PlaylistItem | null {
  if (!isObj(raw)) return null
  if (raw.type === 'video') {
    if (typeof raw.fileName !== 'string' || !raw.fileName) return null
    const video: VideoItem = {
      id: str(raw.id, '') || uuid(),
      type: 'video',
      transition: oneOf(raw.transition, TRANSITIONS, 'crossfade'),
      fileName: raw.fileName,
      displayName: str(raw.displayName, raw.fileName),
      volume: num(raw.volume, 1, 0, 1)
    }
    return video
  }
  if (raw.type === 'slideshow') {
    const rawFrames = Array.isArray(raw.frames) ? raw.frames.filter(isObj) : []
    return normalizeSlideshow(raw, rawFrames.map(normalizeSlideFrame))
  }
  // Pre-slideshow format: a single slide item with its own music.
  if (raw.type === 'slide')
    return normalizeSlideshow(raw, [normalizeSlideFrame({ ...raw, id: uuid() })])
  return null
}

function normalizeMediaList(raw: unknown): ImportedMediaFile[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((f): f is Raw => isObj(f) && typeof f.fileName === 'string' && f.fileName !== '')
    .map((f) => ({
      fileName: f.fileName as string,
      displayName: str(f.displayName, f.fileName as string)
    }))
}

function normalizeLibrary(raw: unknown): MediaLibrary {
  const r = isObj(raw) ? raw : {}
  return {
    videos: normalizeMediaList(r.videos),
    audio: normalizeMediaList(r.audio),
    images: normalizeMediaList(r.images)
  }
}

/** Validates a parsed project file and upgrades anything saved by an older version of the
 * app to the current shape, filling defaults for missing fields. Throws a user-facing
 * message if the JSON isn't a Movie Night project at all. */
export function normalizeProject(raw: unknown): ProjectData {
  if (!isObj(raw) || !Array.isArray(raw.items)) {
    throw new Error("This file isn't a Movie Night project (it has no playlist).")
  }
  const now = new Date().toISOString()
  const countdownRaw = isObj(raw.countdown) ? raw.countdown : {}
  const aiRaw = isObj(raw.aiPrompt) ? raw.aiPrompt : {}
  const defaults = createDefaultAiPrompt()
  return {
    formatVersion: 4,
    id: str(raw.id, '') || uuid(),
    name: str(raw.name, 'Movie Night'),
    createdAt: str(raw.createdAt, now),
    updatedAt: str(raw.updatedAt, now),
    items: raw.items.map(normalizeItem).filter((it): it is PlaylistItem => it !== null),
    countdown: { ...createDefaultCountdown(), ...countdownRaw },
    library: normalizeLibrary(raw.library),
    aiPrompt: {
      event: str(aiRaw.event, defaults.event),
      tone: str(aiRaw.tone, defaults.tone),
      perTitle: Math.round(num(aiRaw.perTitle, defaults.perTitle, 1, 20))
    }
  }
}

/** Every media file a project refers to (library entries plus anything used directly by
 * an item), deduped by kind+fileName, for checking which are still present on disk. */
export function collectMediaRefs(project: ProjectData): MediaRef[] {
  const refs: MediaRef[] = []
  const seen = new Set<string>()
  function add(kind: MediaKind, fileName: string | null, displayName?: string | null): void {
    if (!fileName || seen.has(`${kind}:${fileName}`)) return
    seen.add(`${kind}:${fileName}`)
    refs.push({ kind, fileName, displayName: displayName || fileName })
  }
  project.library.videos.forEach((f) => add('video', f.fileName, f.displayName))
  project.library.audio.forEach((f) => add('audio', f.fileName, f.displayName))
  project.library.images.forEach((f) => add('image', f.fileName, f.displayName))
  for (const item of project.items) {
    if (item.type === 'video') {
      add('video', item.fileName, item.displayName)
    } else {
      if (item.music) add(item.music.kind, item.music.fileName, item.music.displayName)
      for (const frame of item.frames) {
        add('image', frame.backgroundImage, frame.backgroundImageDisplayName)
      }
    }
  }
  return refs
}
