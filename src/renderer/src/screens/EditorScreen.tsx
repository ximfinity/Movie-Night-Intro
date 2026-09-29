import { useEffect, useState } from 'react'
import { useProject } from '../state/useProject'
import PlaylistPanel from '../components/PlaylistPanel'
import InspectorPanel from '../components/inspectors/InspectorPanel'
import { itemTitle } from '../lib/itemMeta'
import { hasFeatureMovie } from '@shared/factory'
import { useRemoteCommands, useRemoteState } from '../hooks/useRemote'
import { RemoteButton } from '../components/RemoteDialog'
import { AiButton } from '../components/AiSettingsDialog'
import './EditorScreen.css'

export default function EditorScreen({
  onStartShow,
  onResumeMovie
}: {
  onStartShow: (startIndex?: number) => void
  onResumeMovie: (atSec: number) => void
}): React.JSX.Element {
  const {
    project,
    dirty,
    saveProject,
    saveProjectAs,
    closeProject,
    missingMedia,
    dismissMissingMedia,
    notice,
    dismissNotice,
    selectedItemId,
    busyMessage,
    undo,
    redo,
    canUndo,
    canRedo
  } = useProject()

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 's') {
        e.preventDefault()
        saveProject()
        return
      }
      // Leave undo inside text fields to the field itself (native text undo).
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveProject, undo, redo])

  // What the phone remote offers while editing: start the show, or resume a movie that was
  // interrupted.
  const [resumeAtSec, setResumeAtSec] = useState<number | null>(null)
  const moviePath =
    project?.feature.source === 'file' && project.feature.player === 'builtin'
      ? project.feature.filePath
      : ''
  useEffect(() => {
    let cancelled = false
    const check = (): void => {
      if (!moviePath) {
        setResumeAtSec(null)
        return
      }
      window.api.getResumePoint(moviePath).then((point) => {
        if (cancelled) return
        const recent = point && Date.now() - Date.parse(point.savedAt) < 48 * 3600_000
        setResumeAtSec(recent && point.positionSec > 30 ? point.positionSec : null)
      })
    }
    check()
    return () => {
      cancelled = true
    }
  }, [moviePath])

  const canStartShow = !!project && (project.items.length > 0 || hasFeatureMovie(project.feature))
  useRemoteState(() => ({
    phase: 'editor',
    projectName: project?.name ?? '',
    movieTitle: project?.feature.title ?? '',
    canStart: canStartShow,
    resumeAtSec,
    hasFeature: !!project && hasFeatureMovie(project.feature)
  }))
  useRemoteCommands(({ cmd }) => {
    if (cmd === 'startShow' && canStartShow) handleStartShow()
    else if (cmd === 'resumeMovie' && resumeAtSec !== null) handleResumeMovie(resumeAtSec)
  })

  if (!project) return <></>

  const canStart = project.items.length > 0 || hasFeatureMovie(project.feature)
  const selectedIndex = project.items.findIndex((it) => it.id === selectedItemId)
  const selectedItem = selectedIndex === -1 ? null : project.items[selectedIndex]

  async function handleStartShow(startIndex?: number): Promise<void> {
    if (dirty) await saveProject()
    onStartShow(startIndex)
  }

  async function handleResumeMovie(atSec: number): Promise<void> {
    if (dirty) await saveProject()
    onResumeMovie(atSec)
  }

  function handleClose(): void {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return
    closeProject()
  }

  return (
    <div className="editor">
      <header className="editor-header">
        <div className="editor-header-left">
          <button className="btn btn-ghost" onClick={handleClose} title="Back to projects">
            ←
          </button>
          <div>
            <div className="editor-title">{project.name}</div>
            <div className="editor-subtitle">{dirty ? 'Unsaved changes' : 'All changes saved'}</div>
          </div>
        </div>
        <div className="editor-header-right">
          <button
            className="btn btn-ghost icon-btn"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            ↶
          </button>
          <button
            className="btn btn-ghost icon-btn"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            ↷
          </button>
          <AiButton />
          <RemoteButton />
          <button className="btn" onClick={saveProject} disabled={!dirty}>
            Save
          </button>
          <button
            className="btn btn-ghost"
            onClick={saveProjectAs}
            title="Save a copy (with all its media) in another folder — e.g. to start next month's show from this one"
          >
            Save As…
          </button>
          {selectedItem && (
            <button
              className="btn"
              onClick={() => handleStartShow(selectedIndex)}
              title={`Go fullscreen and start playing from "${itemTitle(selectedItem)}" instead of the beginning — handy if you need to stop and resume partway through`}
            >
              ▶ Start From Selected
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={() => handleStartShow()}
            disabled={!canStart}
            title={canStart ? 'Go fullscreen and play the show' : 'Add at least one item first'}
          >
            ▶ Start Show
          </button>
        </div>
      </header>
      {notice && (
        <div className="missing-media-banner notice-banner" role="status">
          <span>{notice}</span>
          <button className="btn btn-ghost" onClick={dismissNotice}>
            Got it
          </button>
        </div>
      )}
      {missingMedia.length > 0 && (
        <div className="missing-media-banner">
          <span>
            <strong>{missingMedia.length}</strong> file
            {missingMedia.length === 1 ? '' : 's'} used by this project couldn&apos;t be found on
            disk: {missingMedia.map((f) => f.displayName).join(', ')}
          </span>
          <button className="btn btn-ghost" onClick={dismissMissingMedia}>
            Dismiss
          </button>
        </div>
      )}
      <div className="editor-body">
        <PlaylistPanel />
        <InspectorPanel onResumeMovie={handleResumeMovie} />
      </div>
      {busyMessage && (
        <div className="busy-overlay" role="status">
          <div className="busy-card">
            <span className="busy-spinner" />
            {busyMessage}
          </div>
        </div>
      )}
    </div>
  )
}
