import { createContext } from 'react'
import type {
  CountdownConfig,
  ImportedMediaFile,
  MediaKind,
  PlaylistItem,
  ProjectData
} from '@shared/types'

/** Sentinel selectedItemId value meaning "the countdown overlay settings are selected"
 * (the countdown is a project-level setting, not a playlist item). */
export const COUNTDOWN_SELECTION_ID = '__countdown__'

export interface ProjectState {
  dir: string | null
  project: ProjectData | null
  selectedItemId: string | null
  dirty: boolean
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
}

export const ProjectContext = createContext<ProjectContextValue | null>(null)
