import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { v4 as uuid } from 'uuid'
import type {
  AiPromptSettings,
  CountdownConfig,
  ImportedMediaFile,
  MediaKind,
  OpenProjectResult,
  PlaylistItem,
  ProjectData,
  SlideFrame,
  SlideFrameContent
} from '@shared/types'
import { PROJECT_FILE_NAME } from '@shared/types'
import {
  cloneSlideshowItem,
  createEmptyProject,
  createSlideFrame,
  isPristineDefaultFrame,
  slideStyleOf
} from '@shared/factory'
import { collectMediaRefs, normalizeProject } from '@shared/projectFormat'
import { libraryKey } from '@shared/paths'
import { userMessage } from '../lib/errors'
import {
  ProjectContext,
  type ProjectContextValue,
  type ProjectState,
  type SubtitlePlanEntry
} from './context'

const HISTORY_LIMIT = 100
/** Edits to the same field closer together than this collapse into one undo step. */
const COALESCE_MS = 1000

const EMPTY_STATE: ProjectState = {
  dir: null,
  fileName: PROJECT_FILE_NAME,
  project: null,
  savedProject: null,
  selectedItemId: null,
  copiedFrame: null,
  missingMedia: [],
  past: [],
  future: [],
  lastEdit: { key: null, at: 0 },
  busyMessage: null
}

function loadedState(dir: string, fileName: string, project: ProjectData): ProjectState {
  return { ...EMPTY_STATE, dir, fileName, project, savedProject: project }
}

export function ProjectProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, setState] = useState<ProjectState>(EMPTY_STATE)
  /** Latest committed state, for async actions that must read it after awaiting. */
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  const dirty = state.project !== null && state.project !== state.savedProject

  useEffect(() => {
    window.api.setDirty(dirty)
  }, [dirty])

  /** Applies an undoable change to the project. `coalesceKey` identifies the thing being
   * edited, so a burst of edits to it (keystrokes, slider drags) becomes one undo step. */
  const commit = useCallback((updater: (p: ProjectData) => ProjectData, coalesceKey?: string) => {
    setState((s) => {
      if (!s.project) return s
      const next = updater(s.project)
      if (next === s.project) return s
      const now = Date.now()
      const coalesce =
        coalesceKey !== undefined &&
        s.lastEdit.key === coalesceKey &&
        now - s.lastEdit.at < COALESCE_MS
      return {
        ...s,
        project: next,
        past: coalesce ? s.past : [...s.past, s.project].slice(-HISTORY_LIMIT),
        future: [],
        lastEdit: { key: coalesceKey ?? null, at: now }
      }
    })
  }, [])

  const undo = useCallback(() => {
    setState((s) => {
      if (!s.project || s.past.length === 0) return s
      return {
        ...s,
        project: s.past[s.past.length - 1],
        past: s.past.slice(0, -1),
        future: [s.project, ...s.future].slice(0, HISTORY_LIMIT),
        lastEdit: { key: null, at: 0 }
      }
    })
  }, [])

  const redo = useCallback(() => {
    setState((s) => {
      if (!s.project || s.future.length === 0) return s
      return {
        ...s,
        project: s.future[0],
        past: [...s.past, s.project].slice(-HISTORY_LIMIT),
        future: s.future.slice(1),
        lastEdit: { key: null, at: 0 }
      }
    })
  }, [])

  const finishOpening = useCallback(async (result: OpenProjectResult) => {
    let project: ProjectData
    try {
      project = normalizeProject(result.project)
    } catch (err) {
      window.alert(userMessage(err))
      return
    }
    setState(loadedState(result.dir, result.fileName, project))
    try {
      const missing = await window.api.checkMediaExists(result.dir, collectMediaRefs(project))
      if (missing.length > 0) {
        setState((s) => (s.project === project ? { ...s, missingMedia: missing } : s))
      }
    } catch (err) {
      console.warn('Could not check for missing media:', err)
    }
  }, [])

  const startNewProject = useCallback(async () => {
    try {
      const choice = await window.api.selectNewProjectFolder()
      if (!choice) return
      if (choice.kind === 'open') {
        await finishOpening(choice)
        return
      }
      const name = choice.dir.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? 'Movie Night'
      const project = createEmptyProject(name)
      await window.api.saveProject(choice.dir, PROJECT_FILE_NAME, project)
      setState(loadedState(choice.dir, PROJECT_FILE_NAME, project))
    } catch (err) {
      window.alert(`Couldn't create the project.\n\n${userMessage(err)}`)
    }
  }, [finishOpening])

  const openProject = useCallback(async () => {
    try {
      const result = await window.api.openExistingProject()
      if (result) await finishOpening(result)
    } catch (err) {
      window.alert(`Couldn't open that project.\n\n${userMessage(err)}`)
    }
  }, [finishOpening])

  const saveProject = useCallback(async (): Promise<boolean> => {
    const { dir, fileName, project } = stateRef.current
    if (!dir || !project) return false
    try {
      await window.api.saveProject(dir, fileName, {
        ...project,
        updatedAt: new Date().toISOString()
      })
    } catch (err) {
      window.alert(
        `Couldn't save the project — your changes are NOT saved yet.\n\n${userMessage(err)}`
      )
      return false
    }
    // Edits made while the save was in flight stay unsaved, because `project` moved on.
    setState((s) => (s.dir === dir ? { ...s, savedProject: project } : s))
    return true
  }, [])

  useEffect(
    () =>
      window.api.onSaveAndCloseRequest(async () => {
        if (await saveProject()) window.api.closeWindow()
      }),
    [saveProject]
  )

  const closeProject = useCallback(() => {
    setState(EMPTY_STATE)
  }, [])

  const mutateItems = useCallback(
    (updater: (items: PlaylistItem[]) => PlaylistItem[], coalesceKey?: string) => {
      commit((p) => ({ ...p, items: updater(p.items) }), coalesceKey)
    },
    [commit]
  )

  /** Adds an item right after the selected one (or at the end), and selects it — so
   * several added in a row keep their order. */
  const addItem = useCallback(
    (item: PlaylistItem) => {
      const after = stateRef.current.selectedItemId
      mutateItems((items) => {
        const idx = items.findIndex((it) => it.id === after)
        return idx === -1
          ? [...items, item]
          : [...items.slice(0, idx + 1), item, ...items.slice(idx + 1)]
      })
      setState((s) => ({ ...s, selectedItemId: item.id }))
      stateRef.current = { ...stateRef.current, selectedItemId: item.id }
    },
    [mutateItems]
  )

  const updateItem = useCallback(
    (id: string, patch: Partial<PlaylistItem>) => {
      mutateItems(
        (items) => items.map((it) => (it.id === id ? ({ ...it, ...patch } as PlaylistItem) : it)),
        `item:${id}:${Object.keys(patch).sort().join(',')}`
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
        const original = items[idx]
        const clone: PlaylistItem =
          original.type === 'slideshow' ? cloneSlideshowItem(original) : { ...original, id: uuid() }
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

  const dismissMissingMedia = useCallback(() => {
    setState((s) => ({ ...s, missingMedia: [] }))
  }, [])

  const updateCountdown = useCallback(
    (patch: Partial<CountdownConfig>) => {
      commit(
        (p) => ({ ...p, countdown: { ...p.countdown, ...patch } }),
        `countdown:${Object.keys(patch).sort().join(',')}`
      )
    },
    [commit]
  )

  const importToLibrary = useCallback(
    async (kind: MediaKind): Promise<ImportedMediaFile[]> => {
      const dir = stateRef.current.dir
      if (!dir) return []
      let imported: ImportedMediaFile[]
      try {
        const paths = await window.api.pickMediaFiles(kind)
        if (paths.length === 0) return []
        setState((s) => ({
          ...s,
          busyMessage: `Copying ${paths.length} file${paths.length === 1 ? '' : 's'} into your project…`
        }))
        const result = await window.api.copyMediaIntoProject(dir, kind, paths)
        imported = result.imported
        if (result.failed.length > 0) {
          window.alert(
            `Some files couldn't be imported:\n\n${result.failed.map((f) => `• ${f.name}: ${f.error}`).join('\n')}`
          )
        }
      } catch (err) {
        window.alert(`Import failed.\n\n${userMessage(err)}`)
        return []
      } finally {
        setState((s) => ({ ...s, busyMessage: null }))
      }
      if (imported.length === 0) return []
      const key = libraryKey(kind)
      commit((p) => {
        const existingNames = new Set(p.library[key].map((f) => f.fileName))
        const merged = [
          ...p.library[key],
          ...imported.filter((f) => !existingNames.has(f.fileName))
        ]
        return { ...p, library: { ...p.library, [key]: merged } }
      })
      return imported
    },
    [commit]
  )

  const removeFromLibrary = useCallback(
    (kind: MediaKind, fileName: string) => {
      const key = libraryKey(kind)
      commit((p) => ({
        ...p,
        library: { ...p.library, [key]: p.library[key].filter((f) => f.fileName !== fileName) }
      }))
    },
    [commit]
  )

  const mutateFrames = useCallback(
    (itemId: string, updater: (frames: SlideFrame[]) => SlideFrame[], coalesceKey?: string) => {
      mutateItems(
        (items) =>
          items.map((it) =>
            it.id === itemId && it.type === 'slideshow' ? { ...it, frames: updater(it.frames) } : it
          ),
        coalesceKey
      )
    },
    [mutateItems]
  )

  /** Appends a slide that copies the look (theme, animation, duration) of the group's last
   * slide, so a group stays consistent without re-picking settings. Returns its id. */
  const addFrame = useCallback(
    (itemId: string, content: SlideFrameContent = 'text'): string => {
      const id = uuid()
      mutateFrames(itemId, (frames) => {
        const last = frames[frames.length - 1]
        const style = last ? slideStyleOf(last) : undefined
        return [...frames, { ...createSlideFrame(content, style), id }]
      })
      return id
    },
    [mutateFrames]
  )

  /** Gives every slide in the group the look of one slide. */
  const applyStyleToGroup = useCallback(
    (itemId: string, frameId: string) => {
      mutateFrames(itemId, (frames) => {
        const source = frames.find((f) => f.id === frameId)
        if (!source) return frames
        const style = slideStyleOf(source)
        return frames.map((f) => ({ ...f, ...style }))
      })
    },
    [mutateFrames]
  )

  const updateFrame = useCallback(
    (itemId: string, frameId: string, patch: Partial<SlideFrame>) => {
      mutateFrames(
        itemId,
        (frames) => frames.map((f) => (f.id === frameId ? ({ ...f, ...patch } as SlideFrame) : f)),
        `frame:${frameId}:${Object.keys(patch).sort().join(',')}`
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

  const reorderFrames = useCallback(
    (itemId: string, fromIndex: number, toIndex: number) => {
      mutateFrames(itemId, (frames) => {
        if (
          fromIndex === toIndex ||
          !frames[fromIndex] ||
          toIndex < 0 ||
          toIndex >= frames.length
        ) {
          return frames
        }
        const next = [...frames]
        const [moved] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, moved)
        return next
      })
    },
    [mutateFrames]
  )

  const copyFrame = useCallback(
    (itemId: string, frameId: string): string | null => {
      const item = stateRef.current.project?.items.find((it) => it.id === itemId)
      const original = item?.type === 'slideshow' ? item.frames.find((f) => f.id === frameId) : null
      if (!original) return null
      const cloneId = uuid()
      mutateFrames(itemId, (frames) => {
        const idx = frames.findIndex((f) => f.id === frameId)
        const clone: SlideFrame = {
          ...original,
          id: cloneId,
          subtitleOptions: [...original.subtitleOptions]
        }
        return [...frames.slice(0, idx + 1), clone, ...frames.slice(idx + 1)]
      })
      setState((s) => ({ ...s, copiedFrame: { ...original } }))
      return cloneId
    },
    [mutateFrames]
  )

  const pasteFrame = useCallback(
    (itemId: string): string | null => {
      const copied = stateRef.current.copiedFrame
      if (!copied) return null
      const id = uuid()
      mutateFrames(itemId, (frames) => [...frames, { ...copied, id }])
      return id
    },
    [mutateFrames]
  )

  /** Adds reviewed subtitle lines to existing slides and creates new slides (in the group's
   * current look) for new titles — all as one undo step. Returns the new slides' ids. */
  const applySubtitlePlan = useCallback(
    (itemId: string, plan: SubtitlePlanEntry[]): string[] => {
      const created = plan.filter((e) => !e.frameId).map(() => uuid())
      mutateFrames(itemId, (frames) => {
        const additions = new Map(plan.filter((e) => e.frameId).map((e) => [e.frameId!, e.lines]))
        const updated = frames.map((f) => {
          const lines = additions.get(f.id)
          if (!lines || lines.length === 0) return f
          const kept = f.subtitleOptions.filter((o) => o.trim())
          return { ...f, subtitleOptions: [...kept, ...lines] }
        })
        const last = updated[updated.length - 1]
        const style = last ? slideStyleOf(last) : undefined
        const newFrames = plan
          .filter((e) => !e.frameId)
          .map((e, i) => ({
            ...createSlideFrame('text', style, e.title),
            id: created[i],
            subtitleOptions: e.lines.length > 0 ? e.lines : ['']
          }))
        // A brand-new group's untouched placeholder slide gives way to the real ones.
        const base =
          newFrames.length > 0 && updated.length === 1 && isPristineDefaultFrame(updated[0])
            ? []
            : updated
        return [...base, ...newFrames]
      })
      return created
    },
    [mutateFrames]
  )

  const updateAiPrompt = useCallback(
    (patch: Partial<AiPromptSettings>) => {
      commit(
        (p) => ({ ...p, aiPrompt: { ...p.aiPrompt, ...patch } }),
        `aiPrompt:${Object.keys(patch).sort().join(',')}`
      )
    },
    [commit]
  )

  const value = useMemo<ProjectContextValue>(
    () => ({
      dir: state.dir,
      project: state.project,
      selectedItemId: state.selectedItemId,
      copiedFrame: state.copiedFrame,
      missingMedia: state.missingMedia,
      busyMessage: state.busyMessage,
      dirty,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      startNewProject,
      openProject,
      saveProject,
      closeProject,
      undo,
      redo,
      addItem,
      updateItem,
      removeItem,
      duplicateItem,
      reorderItems,
      selectItem,
      updateCountdown,
      importToLibrary,
      removeFromLibrary,
      addFrame,
      updateFrame,
      removeFrame,
      reorderFrames,
      applyStyleToGroup,
      copyFrame,
      pasteFrame,
      dismissMissingMedia,
      applySubtitlePlan,
      updateAiPrompt
    }),
    [
      state,
      dirty,
      startNewProject,
      openProject,
      saveProject,
      closeProject,
      undo,
      redo,
      addItem,
      updateItem,
      removeItem,
      duplicateItem,
      reorderItems,
      selectItem,
      updateCountdown,
      importToLibrary,
      removeFromLibrary,
      addFrame,
      updateFrame,
      removeFrame,
      reorderFrames,
      applyStyleToGroup,
      copyFrame,
      pasteFrame,
      dismissMissingMedia,
      applySubtitlePlan,
      updateAiPrompt
    ]
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}
