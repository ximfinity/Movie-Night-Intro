import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { v4 as uuid } from 'uuid'
import type {
  CountdownConfig,
  ImportedMediaFile,
  MediaKind,
  PlaylistItem,
  ProjectData,
  SlideFrame,
  SlideFrameContent,
  SlideMusic,
  SlideshowItem
} from '@shared/types'
import {
  createDefaultCountdown,
  createEmptyLibrary,
  createEmptyProject,
  createSlideFrame
} from '@shared/factory'
import { libraryKey } from '@shared/paths'
import { ProjectContext, type ProjectContextValue, type ProjectState } from './context'

/** Backfills a slide frame's fields, including converting the old single-string
 * `subtitle` (pre-random-variants) into `subtitleOptions`. */
function normalizeSlideFrame(raw: Record<string, unknown>): SlideFrame {
  const subtitleOptions = Array.isArray(raw.subtitleOptions)
    ? (raw.subtitleOptions as string[])
    : typeof raw.subtitle === 'string' && raw.subtitle
      ? [raw.subtitle as string]
      : ['']
  return {
    id: (raw.id as string) ?? uuid(),
    content: (raw.content as SlideFrameContent) ?? 'text',
    title: (raw.title as string) ?? '',
    subtitleOptions,
    theme: (raw.theme as SlideFrame['theme']) ?? 'midnight',
    textAnimation: (raw.textAnimation as SlideFrame['textAnimation']) ?? 'fade-up',
    backgroundImage: (raw.backgroundImage as string | null) ?? null,
    backgroundImageDisplayName: (raw.backgroundImageDisplayName as string | null) ?? null,
    durationSec: (raw.durationSec as number) ?? 6
  }
}

/** Backfills a slideshow's music config, including the 'kind'/'position' fields added
 * when pop-up-video music was introduced. */
function normalizeSlideMusic(raw: unknown): SlideMusic | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    kind: r.kind === 'video' ? 'video' : 'audio',
    fileName: r.fileName as string,
    displayName: r.displayName as string,
    volume: (r.volume as number) ?? 0.8,
    fadeInSec: (r.fadeInSec as number) ?? 1.5,
    fadeOutSec: (r.fadeOutSec as number) ?? 1.5,
    position: (r.position as SlideMusic['position']) ?? 'bottom-left',
    loopSlidesUntilEnd: (r.loopSlidesUntilEnd as boolean) ?? false
  }
}

/** Converts the old single-content "slide" item shape (pre-slideshow, one frame with its
 * own music) into a one-frame SlideshowItem, so projects saved before that change still
 * open with their content intact. */
function migrateLegacySlide(raw: Record<string, unknown>): SlideshowItem {
  return {
    id: raw.id as string,
    type: 'slideshow',
    transition: (raw.transition as SlideshowItem['transition']) ?? 'crossfade',
    frames: [normalizeSlideFrame(raw)],
    music: normalizeSlideMusic(raw.music)
  }
}

/** Backfills fields that may be missing from a project saved by an older version of the
 * app, and migrates/drops playlist item shapes that no longer exist. */
function normalizeProject(project: ProjectData): ProjectData {
  const rawItems = project.items as unknown as Array<Record<string, unknown>>
  const items = rawItems
    .map((raw): PlaylistItem | null => {
      if (raw.type === 'video') return raw as unknown as PlaylistItem
      if (raw.type === 'slideshow') {
        const rawFrames = (raw.frames as Array<Record<string, unknown>>) ?? []
        return {
          id: raw.id as string,
          type: 'slideshow',
          transition: (raw.transition as SlideshowItem['transition']) ?? 'crossfade',
          frames: rawFrames.map(normalizeSlideFrame),
          music: normalizeSlideMusic(raw.music)
        }
      }
      if (raw.type === 'slide') return migrateLegacySlide(raw)
      return null
    })
    .filter((it): it is PlaylistItem => it !== null)

  return {
    ...project,
    items,
    countdown: { ...createDefaultCountdown(), ...project.countdown },
    library: project.library ?? createEmptyLibrary()
  }
}

export function ProjectProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, setState] = useState<ProjectState>({
    dir: null,
    project: null,
    selectedItemId: null,
    dirty: false,
    copiedFrame: null
  })

  const startNewProject = useCallback(async () => {
    const dir = await window.api.selectNewProjectFolder()
    if (!dir) return
    const name = dir.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? 'Movie Night'
    const project = createEmptyProject(name)
    setState({ dir, project, selectedItemId: null, dirty: true, copiedFrame: null })
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
      dirty: false,
      copiedFrame: null
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
    setState({ dir: null, project: null, selectedItemId: null, dirty: false, copiedFrame: null })
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

  const mutateFrames = useCallback(
    (itemId: string, updater: (frames: SlideFrame[]) => SlideFrame[]) => {
      mutateItems((items) =>
        items.map((it) =>
          it.id === itemId && it.type === 'slideshow' ? { ...it, frames: updater(it.frames) } : it
        )
      )
    },
    [mutateItems]
  )

  const addFrame = useCallback(
    (itemId: string, content: SlideFrameContent = 'text') => {
      mutateFrames(itemId, (frames) => [...frames, createSlideFrame(content)])
    },
    [mutateFrames]
  )

  const updateFrame = useCallback(
    (itemId: string, frameId: string, patch: Partial<SlideFrame>) => {
      mutateFrames(itemId, (frames) =>
        frames.map((f) => (f.id === frameId ? ({ ...f, ...patch } as SlideFrame) : f))
      )
    },
    [mutateFrames]
  )

  const removeFrame = useCallback(
    (itemId: string, frameId: string) => {
      mutateFrames(itemId, (frames) =>
        frames.length <= 1 ? frames : frames.filter((f) => f.id !== frameId)
      )
    },
    [mutateFrames]
  )

  const moveFrame = useCallback(
    (itemId: string, frameId: string, direction: 'up' | 'down') => {
      mutateFrames(itemId, (frames) => {
        const idx = frames.findIndex((f) => f.id === frameId)
        const target = direction === 'up' ? idx - 1 : idx + 1
        if (idx === -1 || target < 0 || target >= frames.length) return frames
        const next = [...frames]
        ;[next[idx], next[target]] = [next[target], next[idx]]
        return next
      })
    },
    [mutateFrames]
  )

  const copyFrame = useCallback((itemId: string, frameId: string) => {
    setState((s) => {
      if (!s.project) return s
      const item = s.project.items.find((it) => it.id === itemId)
      if (!item || item.type !== 'slideshow') return s
      const idx = item.frames.findIndex((f) => f.id === frameId)
      if (idx === -1) return s
      const original = item.frames[idx]
      const clone: SlideFrame = { ...original, id: uuid() }
      const items = s.project.items.map((it) =>
        it.id === itemId && it.type === 'slideshow'
          ? { ...it, frames: [...it.frames.slice(0, idx + 1), clone, ...it.frames.slice(idx + 1)] }
          : it
      )
      return {
        ...s,
        project: { ...s.project, items },
        copiedFrame: { ...original },
        dirty: true
      }
    })
  }, [])

  const pasteFrame = useCallback((itemId: string) => {
    setState((s) => {
      if (!s.project || !s.copiedFrame) return s
      const clone: SlideFrame = { ...s.copiedFrame, id: uuid() }
      const items = s.project.items.map((it) =>
        it.id === itemId && it.type === 'slideshow' ? { ...it, frames: [...it.frames, clone] } : it
      )
      return { ...s, project: { ...s.project, items }, dirty: true }
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
      removeFromLibrary,
      addFrame,
      updateFrame,
      removeFrame,
      moveFrame,
      copyFrame,
      pasteFrame
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
      removeFromLibrary,
      addFrame,
      updateFrame,
      removeFrame,
      moveFrame,
      copyFrame,
      pasteFrame
    ]
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}
