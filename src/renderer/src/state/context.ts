import { createContext } from 'react'
import type {
  CountdownConfig,
  ImportedMediaFile,
  MediaKind,
  MediaRef,
  PlaylistItem,
  ProjectData,
  SlideFrame,
  SlideFrameContent
} from '@shared/types'

/** Sentinel selectedItemId value meaning "the countdown overlay settings are selected"
 * (the countdown is a project-level setting, not a playlist item). */
export const COUNTDOWN_SELECTION_ID = '__countdown__'

export interface ProjectState {
  dir: string | null
  project: ProjectData | null
  selectedItemId: string | null
  dirty: boolean
  /** In-memory clipboard for reusing a slide frame across slideshow items; never saved. */
  copiedFrame: SlideFrame | null
  /** Media files the open project refers to that couldn't be found on disk, detected on
   * open; never saved. Cleared when the banner showing them is dismissed. */
  missingMedia: MediaRef[]
}

export interface ProjectContextValue extends ProjectState {
  startNewProject: () => Promise<void>
  openProject: () => Promise<void>
  saveProject: () => Promise<void>
  addItem: (item: PlaylistItem) => void
  updateItem: (id: string, patch: Partial<PlaylistItem>) => void
  removeItem: (id: string) => void
  duplicateItem: (id: string) => void
  reorderItems: (fromIndex: number, toIndex: number) => void
  selectItem: (id: string | null) => void
  closeProject: () => void
  updateCountdown: (patch: Partial<CountdownConfig>) => void
  importToLibrary: (kind: MediaKind) => Promise<ImportedMediaFile[]>
  removeFromLibrary: (kind: MediaKind, fileName: string) => void
  addFrame: (itemId: string, content?: SlideFrameContent) => void
  updateFrame: (itemId: string, frameId: string, patch: Partial<SlideFrame>) => void
  removeFrame: (itemId: string, frameId: string) => void
  moveFrame: (itemId: string, frameId: string, direction: 'up' | 'down') => void
  /** Duplicates the frame in place within its own group, and stores a copy in the
   * clipboard so it can also be pasted into a different slideshow item. */
  copyFrame: (itemId: string, frameId: string) => void
  pasteFrame: (itemId: string) => void
  dismissMissingMedia: () => void
}

export const ProjectContext = createContext<ProjectContextValue | null>(null)
