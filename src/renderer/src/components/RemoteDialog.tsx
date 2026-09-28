import { useEffect, useState } from 'react'
import type { RemoteServerStatus } from '@shared/remote'
import { userMessage } from '../lib/errors'
import Modal from './Modal'

/** Header button showing whether the phone remote is on; opens its settings. */
export function RemoteButton(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<RemoteServerStatus | null>(null)

  useEffect(() => {
    window.api
      .getRemoteStatus()
      .then(setStatus)
      .catch(() => {})
  }, [open])

  return (
    <>
      <button
        className="btn btn-ghost remote-btn"
        onClick={() => setOpen(true)}
        title="Control the show from your phone"
      >
        📱 Remote
        {status?.running && <span className="remote-dot" aria-label="on" />}
      </button>
      {open && <RemoteDialog onClose={() => setOpen(false)} />}
    </>
  )
}

function RemoteDialog({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [status, setStatus] = useState<RemoteServerStatus | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    window.api
      .getRemoteStatus()
      .then(setStatus)
      .catch(() => {})
  }, [])

  async function run(action: () => Promise<RemoteServerStatus>): Promise<void> {
    setBusy(true)
    try {
      setStatus(await action())
    } catch (err) {
      window.alert(userMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="📱 Phone remote" onClose={onClose} width={560}>
      <p className="inspector-hint">
        Start the show, wrap up the pre-show, start the movie, pause, change the volume and move the
        countdown, from any phone&apos;s web browser. No app to install.
      </p>
      <label className="checkbox-row">
        <input
          type="checkbox"
          disabled={busy || !status}
          checked={status?.enabled ?? false}
          onChange={(e) => run(() => window.api.setRemoteEnabled(e.target.checked))}
        />
        Turn on the phone remote
      </label>

      {status?.error && <p className="feature-warning">⚠ {status.error}</p>}

      {status?.running && (
        <div className="remote-connect">
          {status.urls.length > 0 ? (
            <>
              <div className="remote-step">
                1. Connect your phone to the <strong>same Wi-Fi</strong> as this PC, then open:
              </div>
              {status.urls.map((url) => (
                <div key={url} className="remote-url">
                  {url.replace(/^http:\/\//, '')}
                </div>
              ))}
              <div className="remote-step">2. Enter this PIN:</div>
              <div className="remote-pin">{status.pin}</div>
            </>
          ) : (
            <p className="feature-warning">
              This PC isn&apos;t on a network right now. Connect it to Wi-Fi (or your event&apos;s
              router), then reopen this window.
            </p>
          )}
          <button
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Make a new PIN? Phones using the old one will need the new one.'))
                run(() => window.api.newRemotePin())
            }}
          >
            New PIN
          </button>
        </div>
      )}

      <p className="inspector-hint">
        <strong>If the phone can&apos;t connect:</strong> the first time the remote turns on,
        Windows asks whether to let the app use the network: allow it on{' '}
        <strong>private networks</strong>, and in Windows Wi-Fi settings set your event&apos;s
        network to <em>Private</em>. Guest and school networks often block phones from reaching
        other devices; your own router is the reliable choice.
      </p>
      <div className="modal-footer">
        <button className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  )
}
