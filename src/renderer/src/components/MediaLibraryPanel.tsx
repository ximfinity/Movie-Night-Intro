import { useState } from 'react'
import type { MediaKind } from '@shared/types'
import { createVideoItem } from '@shared/factory'
import { libraryKey } from '@shared/paths'
import { useProject } from '../state/useProject'
import './MediaLibraryPanel.css'

const SECTIONS: { kind: MediaKind; label: string; icon: string }[] = [
  { kind: 'video', label: 'Videos', icon: '🎬' },
  { kind: 'audio', label: 'Music', icon: '🎵' },
  { kind: 'image', label: 'Images', icon: '🖼️' }
]

export default function MediaLibraryPanel(): React.JSX.Element {
  const { project, addItem, importToLibrary, removeFromLibrary } = useProject()
  const [open, setOpen] = useState(true)

  if (!project) return <></>

  async function handleImport(kind: MediaKind): Promise<void> {
    await importToLibrary(kind)
  }

  return (
    <div className="media-library">
      <button className="media-library-toggle" onClick={() => setOpen((o) => !o)}>
        <span>{open ? '▾' : '▸'} Media Library</span>
        <span className="media-library-hint">import once, reuse anywhere</span>
      </button>

      {open && (
        <div className="media-library-body">
          {SECTIONS.map(({ kind, label, icon }) => {
            const files = project.library[libraryKey(kind)]
            return (
              <div className="media-library-section" key={kind}>
                <div className="media-library-section-header">
                  <span>
                    {icon} {label} ({files.length})
                  </span>
                  <button
                    className="btn btn-ghost media-library-import"
                    onClick={() => handleImport(kind)}
                  >
                    + Import
                  </button>
                </div>
                {files.length === 0 ? (
                  <p className="media-library-empty">Nothing imported yet.</p>
                ) : (
                  <ul className="media-library-chips">
                    {files.map((f) => (
                      <li className="media-library-chip" key={f.fileName}>
                        <span className="media-library-chip-name" title={f.displayName}>
                          {f.displayName}
                        </span>
                        {kind === 'video' && (
                          <button
                            className="media-library-chip-action"
                            title="Add to show"
                            onClick={() => addItem(createVideoItem(f.fileName, f.displayName))}
                          >
                            +
                          </button>
                        )}
                        <button
                          className="media-library-chip-action media-library-chip-remove"
                          title="Remove from library"
                          onClick={() => removeFromLibrary(kind, f.fileName)}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
