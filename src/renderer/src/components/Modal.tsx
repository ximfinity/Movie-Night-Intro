import { useEffect, useState, type ReactNode } from 'react'

import { isTopModal, pushModal } from '../lib/modalStack'

export default function Modal({
  title,
  onClose,
  children,
  width = 720
}: {
  title: string
  onClose: () => void
  children: ReactNode
  width?: number
}): React.JSX.Element {
  const [token] = useState(() => ({}))
  useEffect(() => pushModal(token), [token])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isTopModal(token)) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, token])

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth: width }}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn-ghost icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
