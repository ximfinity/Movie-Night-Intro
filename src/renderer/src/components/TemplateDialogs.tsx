import { useEffect, useState } from 'react'
import type { TemplateSummary } from '@shared/types'
import { useProject } from '../state/useProject'
import { userMessage } from '../lib/errors'
import Modal from './Modal'

/** Browse the shared template library and insert a slide group into this project. */
export function TemplatePickerDialog({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { insertTemplate } = useProject()
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api
      .listTemplates()
      .then((list) => !cancelled && setTemplates(list))
      .catch((err) => !cancelled && setError(userMessage(err)))
    return () => {
      cancelled = true
    }
  }, [])

  async function handleInsert(id: string): Promise<void> {
    setBusyId(id)
    const ok = await insertTemplate(id)
    setBusyId(null)
    if (ok) onClose()
  }

  async function handleDelete(t: TemplateSummary): Promise<void> {
    if (!window.confirm(`Delete the template "${t.name}"? This can't be undone.`)) return
    try {
      await window.api.deleteTemplate(t.id)
      setTemplates((list) => list?.filter((x) => x.id !== t.id) ?? null)
    } catch (err) {
      window.alert(`Couldn't delete the template.\n\n${userMessage(err)}`)
    }
  }

  return (
    <Modal title="Insert a slide group from your templates" onClose={onClose} width={620}>
      {error && <p className="inspector-hint">Couldn&apos;t read your templates: {error}</p>}
      {!error && templates === null && <p className="inspector-hint">Loading…</p>}
      {templates?.length === 0 && (
        <p className="template-empty">
          No templates yet. Open a slide group and click <strong>📚 Save as template</strong> to
          reuse it in any project — its images and music come with it.
        </p>
      )}
      {templates && templates.length > 0 && (
        <ul className="template-list">
          {templates.map((t) => (
            <li key={t.id} className="template-card">
              <div className="template-card-text">
                <div className="template-card-name">{t.name}</div>
                <div className="template-card-meta">
                  {t.slideCount} slide{t.slideCount === 1 ? '' : 's'}
                  {t.musicName ? ` · 🎵 ${t.musicName}` : ''}
                </div>
                {t.sampleTitles.length > 0 && (
                  <div className="template-card-sample">{t.sampleTitles.join(' · ')}</div>
                )}
              </div>
              <button
                className="btn btn-ghost icon-btn btn-danger"
                title="Delete this template"
                onClick={() => handleDelete(t)}
              >
                ✕
              </button>
              <button
                className="btn btn-primary"
                disabled={busyId !== null}
                onClick={() => handleInsert(t.id)}
              >
                {busyId === t.id ? 'Inserting…' : 'Insert'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

/** Name and save a slide group to the shared template library. */
export function SaveTemplateDialog({
  itemId,
  defaultName,
  onClose
}: {
  itemId: string
  defaultName: string
  onClose: () => void
}): React.JSX.Element {
  const { saveGroupAsTemplate } = useProject()
  const [name, setName] = useState(defaultName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(): Promise<void> {
    setSaving(true)
    const ok = await saveGroupAsTemplate(itemId, name)
    setSaving(false)
    if (ok) {
      setSaved(true)
      setTimeout(onClose, 900)
    }
  }

  return (
    <Modal title="Save this slide group as a template" onClose={onClose} width={480}>
      <label className="field">
        <span className="field-label">Template name</span>
        <input
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) handleSave()
          }}
        />
      </label>
      <p className="inspector-hint">
        Templates are shared by all your projects. The slides&apos; text, look, images and music are
        saved with it; insert it from <strong>📚 Template</strong> under the playlist.
      </p>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          disabled={!name.trim() || saving || saved}
          onClick={handleSave}
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save template'}
        </button>
      </div>
    </Modal>
  )
}
