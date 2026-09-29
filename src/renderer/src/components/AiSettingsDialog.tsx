import { useState } from 'react'
import {
  AI_PROVIDERS,
  aiReady,
  findProvider,
  type AiConfigView,
  type AiProviderId,
  type AiSettingsPatch
} from '@shared/ai'
import { setAiConfig, useAiConfig } from '../lib/aiConfig'
import { userMessage } from '../lib/errors'
import Modal from './Modal'

/** Header button: opens the AI settings, and shows which AI is connected. */
export function AiButton(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const config = useAiConfig()
  const ready = aiReady(config).text
  return (
    <>
      <button
        className="btn btn-ghost remote-btn"
        onClick={() => setOpen(true)}
        title={
          ready
            ? `Connected to ${findProvider(config!.active!).label}`
            : 'Connect your own AI to write lines and make memes in one click'
        }
      >
        ✨ AI
        {ready && <span className="remote-dot" aria-label="connected" />}
      </button>
      {open && <AiSettingsDialog onClose={() => setOpen(false)} />}
    </>
  )
}

export default function AiSettingsDialog({ onClose }: { onClose: () => void }): React.JSX.Element {
  const config = useAiConfig()
  // The provider being looked at: the one in use until another is clicked.
  const [picked, setSelected] = useState<AiProviderId | null>(null)
  const selected: AiProviderId = picked ?? config?.active ?? 'anthropic'
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function run(label: string, action: () => Promise<AiConfigView | void>): Promise<void> {
    setBusy(label)
    setMessage(null)
    try {
      const next = await action()
      if (next) setAiConfig(next)
    } catch (err) {
      setMessage({ ok: false, text: userMessage(err) })
    } finally {
      setBusy(null)
    }
  }

  const update = (patch: AiSettingsPatch): Promise<void> =>
    run('save', () => window.api.updateAiSettings(patch))

  if (!config) {
    return (
      <Modal title="✨ Connect your AI" onClose={onClose} width={720}>
        <p className="inspector-hint">Loading…</p>
      </Modal>
    )
  }

  const info = findProvider(selected)
  const settings = config.providers[selected]
  const isActive = config.active === selected

  return (
    <Modal title="✨ Connect your AI" onClose={onClose} width={720}>
      <p className="inspector-hint">
        Use your own AI account to write subtitle lines, trivia and meme captions, and to draw meme
        pictures, right inside the app. Without one, the 📋 copy-and-paste prompts keep working with
        any AI chat.
      </p>

      <div className="ai-provider-grid" role="radiogroup" aria-label="AI provider">
        {AI_PROVIDERS.map((p) => {
          const s = config.providers[p.id]
          const ready = aiReady({ ...config, active: p.id }).text
          return (
            <button
              key={p.id}
              role="radio"
              aria-checked={selected === p.id}
              className={`ai-provider-card ${selected === p.id ? 'ai-provider-selected' : ''}`}
              onClick={() => {
                setSelected(p.id)
                setMessage(null)
              }}
            >
              <span className="ai-provider-name">{p.label}</span>
              <span className="ai-provider-status">
                {config.active === p.id
                  ? ready
                    ? '● In use'
                    : '● In use (needs setup)'
                  : s.hasKey || (!p.needsKey && s.textModel)
                    ? 'Set up'
                    : ''}
              </span>
            </button>
          )
        })}
      </div>

      <section className="ai-provider-settings">
        <p className="inspector-hint">{info.blurb}</p>

        {info.needsBaseUrl && (
          <DeferredInput
            key={selected}
            label="Server address"
            placeholder="http://localhost:11434/v1"
            value={settings.baseUrl}
            onCommit={(baseUrl) => update({ provider: selected, baseUrl })}
          />
        )}

        <KeyField
          key={`${selected}-${settings.hasKey}-${settings.keyHint}`}
          hasKey={settings.hasKey}
          keyHint={settings.keyHint}
          optional={!info.needsKey}
          keyUrl={info.keyUrl}
          encrypted={config.encrypted}
          busy={busy !== null}
          onSave={(key) => run('key', () => window.api.setAiKey(selected, key))}
        />

        <ModelField
          key={`${selected}-text`}
          provider={selected}
          label="Text model (lines, trivia, captions)"
          value={settings.textModel}
          suggestions={info.textModelSuggestions}
          onCommit={(textModel) => update({ provider: selected, textModel })}
        />
        {info.supportsImages && (
          <ModelField
            key={`${selected}-image`}
            provider={selected}
            label="Picture model (meme pictures; optional)"
            value={settings.imageModel}
            suggestions={info.imageModelSuggestions}
            onCommit={(imageModel) => update({ provider: selected, imageModel })}
          />
        )}

        <div className="ai-row">
          <button
            className="btn"
            disabled={busy !== null}
            onClick={() =>
              run('test', async () => {
                const reply = await window.api.testAi(selected)
                setMessage({ ok: true, text: `It works! ${info.label} says: “${reply}”` })
              })
            }
          >
            {busy === 'test' ? 'Testing…' : 'Test connection'}
          </button>
          {isActive ? (
            <button
              className="btn btn-ghost"
              disabled={busy !== null}
              onClick={() => update({ active: null })}
            >
              Stop using AI
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={busy !== null}
              onClick={() => update({ active: selected })}
            >
              Use {info.label}
            </button>
          )}
        </div>
        {message && (
          <p className={message.ok ? 'ai-message-ok' : 'feature-warning'} role="status">
            {message.text}
          </p>
        )}
      </section>

      <p className="inspector-hint">
        Your key is stored {config.encrypted ? 'encrypted ' : ''}on this PC only (never in project
        files) and is sent only to {info.label}. Each request is billed to your own account, usually
        a fraction of a cent for a batch of lines; pictures cost more. Everything the AI writes is
        shown for review before it&apos;s added.
      </p>
      <div className="modal-footer">
        <button className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  )
}

/** A text box that saves when you leave it (or press Enter), not on every keystroke. */
function DeferredInput({
  label,
  value,
  placeholder,
  list,
  onCommit,
  children
}: {
  label: string
  value: string
  placeholder?: string
  list?: string
  onCommit: (v: string) => void
  children?: React.ReactNode
}): React.JSX.Element {
  // null = untouched, so the box follows the saved value until someone types.
  const [edited, setDraft] = useState<string | null>(null)
  const draft = edited ?? value
  const commit = (): void => {
    if (draft.trim() !== value) onCommit(draft.trim())
    setDraft(null)
  }
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="picker-row">
        <input
          type="text"
          value={draft}
          placeholder={placeholder}
          list={list}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
          }}
        />
        {children}
      </div>
    </div>
  )
}

function ModelField({
  provider,
  label,
  value,
  suggestions,
  onCommit
}: {
  provider: AiProviderId
  label: string
  value: string
  suggestions: string[]
  onCommit: (v: string) => void
}): React.JSX.Element {
  const [loaded, setLoaded] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listId = `models-${provider}-${label.slice(0, 4)}`

  async function load(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      setLoaded(await window.api.listAiModels(provider))
    } catch (err) {
      setError(userMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const options = [...new Set([...suggestions, ...(loaded ?? [])])]
  return (
    <>
      <DeferredInput label={label} value={value} list={listId} onCommit={onCommit}>
        <button
          className="btn"
          onClick={load}
          disabled={loading}
          title="Ask the service which models your account can use"
        >
          {loading ? 'Loading…' : 'Load models'}
        </button>
      </DeferredInput>
      <datalist id={listId}>
        {options.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      {loaded && (
        <p className="inspector-hint ai-models-hint">
          {loaded.length} models available: click the box to pick one.
        </p>
      )}
      {error && <p className="feature-warning">{error}</p>}
    </>
  )
}

function KeyField({
  hasKey,
  keyHint,
  optional,
  keyUrl,
  encrypted,
  busy,
  onSave
}: {
  hasKey: boolean
  keyHint: string
  optional: boolean
  keyUrl: string
  encrypted: boolean
  busy: boolean
  onSave: (key: string) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState('')
  const [replacing, setReplacing] = useState(false)

  return (
    <div className="field">
      <span className="field-label">
        API key{optional ? ' (only if your server needs one)' : ''}
        {keyUrl && (
          <a href={keyUrl} target="_blank" rel="noreferrer">
            Get a key ↗
          </a>
        )}
      </span>
      {hasKey && !replacing ? (
        <div className="picker-row">
          <div className="feature-path">Saved key ••••{keyHint}</div>
          <button className="btn" onClick={() => setReplacing(true)}>
            Replace
          </button>
          <button className="btn btn-ghost btn-danger" disabled={busy} onClick={() => onSave('')}>
            Remove
          </button>
        </div>
      ) : (
        <div className="picker-row">
          <input
            type="password"
            className="ai-key-input"
            value={draft}
            placeholder="Paste your API key"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) onSave(draft)
            }}
          />
          <button
            className="btn btn-primary"
            disabled={busy || !draft.trim()}
            onClick={() => onSave(draft)}
          >
            Save key
          </button>
        </div>
      )}
      {!encrypted && (
        <p className="feature-warning">
          This PC can&apos;t encrypt saved secrets, so the key is stored as plain text in the
          app&apos;s settings folder.
        </p>
      )}
    </div>
  )
}
