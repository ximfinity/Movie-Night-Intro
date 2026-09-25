import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type {
  CountdownConfig,
  ImportedMediaFile,
  MediaKind,
  PlaylistItem,
  ProjectData
} from '@shared/types'
import { createDefaultCountdown, createEmptyLibrary, createEmptyProject } from '@shared/factory'
import { libraryKey } from '@shared/paths'
import { ProjectContext, type ProjectContextValue, type ProjectState } from './context'

/** Backfills fields that may be missing from a project saved by an older version of the
 * app, and drops playlist item types that no longer exist (e.g. the old inline countdown item). */
function normalizeProject(project: ProjectData): ProjectData {
  return {
    ...project,
    items: project.items.filter((it) => it.type === 'video' || it.type === 'slide'),
    countdown: { ...createDefaultCountdown(), ...project.countdown },
    library: project.library ?? createEmptyLibrary()
  }
}

export function ProjectProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, setState] = useState<ProjectState>({
    dir: null,
    project: null,
    selectedItemId: null,
    dirty: false
  })

  const startNewProject = useCallback(async () => {
    const dir = await window.api.selectNewProjectFolder()
    if (!dir) return
    const name = dir.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? 'Movie Night'
    const project = createEmptyProject(name)
    setState({ dir, project, selectedItemId: null, dirty: true })
    await window.api.saveProject(dir, project)
    setState((s) => ({ ...s, dirty: false }))
  }, [])

  const openProject = useCallback(async () => {
    const result = await window.api.openExistingProject()
    if (!result) return
    setState({
      dir: result.dir,
      project: normalizeProject(result.project),
      selectedItemId: null,
      dirty: false
    })
  }, [])

  const saveProject = useCallback(async () => {
    setState((s) => {
      if (!s.dir || !s.project) return s
      const updated: ProjectData = { ...s.project, updatedAt: new Date().toISOString() }
      window.api.saveProject(s.dir, updated)
      return { ...s, project: updated, dirty: false }
    })
  }, [])

  const mutateItems = useCallback((updater: (items: PlaylistItem[]) => PlaylistItem[]) => {
    setState((s) => {
      if (!s.project) return s
      return {
        ...s,
        project: { ...s.project, items: updater(s.project.items) },
        dirty: true
      }
    })
  }, [])

  const addItem = useCallback(
    (item: PlaylistItem) => {
      mutateItems((items) => [...items, item])
      setState((s) => ({ ...s, selectedItemId: item.id }))
    },
    [mutateItems]
  )

  const updateItem = useCallback(
    (id: string, patch: Partial<PlaylistItem>) => {
      mutateItems((items) =>
        items.map((it) => (it.id === id ? ({ ...it, ...patch } as PlaylistItem) : it))
      )
    },
    [mutateItems]
  )

  const removeItem = useCallback(
    (id: string) => {
      mutateItems((items) => items.filter((it) => it.id !== id))
      setState((s) => ({ ...s, selectedItemId: s.selectedItemId === id ? null : s.selectedItemId }))
    },
    [mutateItems]
  )

  const duplicateItem = useCallback(
    (id: string) => {
      mutateItems((items) => {
        const idx = items.findIndex((it) => it.id === id)
        if (idx === -1) return items
        const clone: PlaylistItem = { ...items[idx], id: crypto.randomUUID() }
        const next = [...items]
        next.splice(idx + 1, 0, clone)
        return next
      })
    },
    [mutateItems]
  )

  const reorderItems = useCallback(
    (fromIndex: number, toIndex: number) => {
      mutateItems((items) => {
        const next = [...items]
        const [moved] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, moved)
        return next
      })
    },
    [mutateItems]
  )

  const selectItem = useCallback((id: string | null) => {
    setState((s) => ({ ...s, selectedItemId: id }))
  }, [])

  const closeProject = useCallback(() => {
    setState({ dir: null, project: null, selectedItemId: null, dirty: false })
  }, [])

  const updateCountdown = useCallback((patch: Partial<CountdownConfig>) => {
    setState((s) => {
      if (!s.project) return s
      return {
        ...s,
        project: { ...s.project, countdown: { ...s.project.countdown, ...patch } },
        dirty: true
      }
    })
  }, [])

  const importToLibrary = useCallback(
    async (kind: MediaKind): Promise<ImportedMediaFile[]> => {
      if (!state.dir) return []
      const files = await window.api.importMedia(state.dir, kind)
      if (files.length === 0) return []
      const key = libraryKey(kind)
      setState((s) => {
        if (!s.project) return s
        const existingNames = new Set(s.project.library[key].map((f) => f.fileName))
        const merged = [
          ...s.project.library[key],
          ...files.filter((f) => !existingNames.has(f.fileName))
        ]
        return {
          ...s,
          project: { ...s.project, library: { ...s.project.library, [key]: merged } },
          dirty: true
        }
      })
      return files
    },
    [state.dir]
  )

  const removeFromLibrary = useCallback((kind: MediaKind, fileName: string) => {
    const key = libraryKey(kind)
    setState((s) => {
      if (!s.project) return s
      return {
        ...s,
        project: {
          ...s.project,
          library: {
            ...s.project.library,
            [key]: s.project.library[key].filter((f) => f.fileName !== fileName)
          }
        },
        dirty: true
      }
    })
  }, [])

  const value = useMemo<ProjectContextValue>(
    () => ({
      ...state,
      startNewProject,
      openProject,
      saveProject,
      addItem,
      updateItem,
      removeItem,
      duplicateItem,
      reorderItems,
      selectItem,
      closeProject,
      updateCountdown,
      importToLibrary,
      removeFromLibrary
    }),
    [
      state,
      startNewProject,
      openProject,
      saveProject,
      addItem,
      updateItem,
      removeItem,
      duplicateItem,
      reorderItems,
      selectItem,
      closeProject,
      updateCountdown,
      importToLibrary,
      removeFromLibrary
    ]
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}
