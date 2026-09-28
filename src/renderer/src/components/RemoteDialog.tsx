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
            <RemoteConnect urls={status.urls} pin={status.pin} />
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

/** Scan-to-connect QR code (it carries the PIN, so the phone signs straight in), with the
 * typed address and PIN as the fallback. */
function RemoteConnect({ urls, pin }: { urls: string[]; pin: string }): React.JSX.Element {
  const [url, setUrl] = useState(urls[0])
  const [qr, setQr] = useState<string | null>(null)
  const current = urls.includes(url) ? url : urls[0]

  useEffect(() => {
    let cancelled = false
    window.api
      .remoteQrCode(current)
      .then((dataUrl) => !cancelled && setQr(dataUrl))
      .catch(() => !cancelled && setQr(null))
    return () => {
      cancelled = true
    }
  }, [current, pin])

  return (
    <div className="remote-connect-grid">
      <div className="remote-qr">
        {qr ? (
          <img src={qr} alt="QR code to open the phone remote" />
        ) : (
          <div className="remote-qr-empty" />
        )}
        <div className="remote-step">Scan with your phone&apos;s camera</div>
      </div>
      <div>
        <div className="remote-step">
          Your phone must be on the <strong>same Wi-Fi</strong> as this PC. No camera? Open:
        </div>
        {urls.length > 1 ? (
          <select
            className="remote-url-select"
            value={current}
            onChange={(e) => setUrl(e.target.value)}
            title="This PC is on more than one network: pick the one your phone uses"
          >
            {urls.map((u) => (
              <option key={u} value={u}>
                {u.replace(/^http:\/\//, '')}
              </option>
            ))}
          </select>
        ) : (
          <div className="remote-url">{current.replace(/^http:\/\//, '')}</div>
        )}
        <div className="remote-step">and enter this PIN:</div>
        <div className="remote-pin">{pin}</div>
      </div>
    </div>
  )
}
