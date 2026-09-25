import { useEffect } from 'react'
import { useProject } from '../state/useProject'
import PlaylistPanel from '../components/PlaylistPanel'
import InspectorPanel from '../components/inspectors/InspectorPanel'
import './EditorScreen.css'

export default function EditorScreen({
  onStartShow
}: {
  onStartShow: () => void
}): React.JSX.Element {
  const { project, dirty, saveProject, closeProject } = useProject()

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

  async function handleStartShow(): Promise<void> {
    if (dirty) await saveProject()
    onStartShow()
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
          <button
            className="btn btn-primary"
            onClick={handleStartShow}
            disabled={!canStart}
            title={canStart ? 'Go fullscreen and play the show' : 'Add at least one item first'}
          >
            ▶ Start Show
          </button>
        </div>
      </header>
      <div className="editor-body">
        <PlaylistPanel />
        <InspectorPanel />
      </div>
    </div>
  )
}
