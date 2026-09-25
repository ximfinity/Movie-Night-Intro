import { useEffect } from 'react'
import { useProject } from '../state/useProject'
import PlaylistPanel from '../components/PlaylistPanel'
import InspectorPanel from '../components/inspectors/InspectorPanel'
import { itemTitle } from '../lib/itemMeta'
import './EditorScreen.css'

export default function EditorScreen({
  onStartShow
}: {
  onStartShow: (startIndex?: number) => void
}): React.JSX.Element {
  const {
    project,
    dirty,
    saveProject,
    closeProject,
    missingMedia,
    dismissMissingMedia,
    selectedItemId
  } = useProject()

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveProject()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveProject])

  if (!project) return <></>

  const canStart = project.items.length > 0
  const selectedIndex = project.items.findIndex((it) => it.id === selectedItemId)
  const selectedItem = selectedIndex === -1 ? null : project.items[selectedIndex]

  async function handleStartShow(startIndex?: number): Promise<void> {
    if (dirty) await saveProject()
    onStartShow(startIndex)
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
          <button className="btn" onClick={saveProject} disabled={!dirty}>
            Save
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
        <InspectorPanel />
      </div>
    </div>
  )
}
