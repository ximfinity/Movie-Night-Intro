import { createContext } from 'react'
import type { PlaylistItem, ProjectData } from '@shared/types'

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
}

export const ProjectContext = createContext<ProjectContextValue | null>(null)
