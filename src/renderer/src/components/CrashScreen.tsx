import { useEffect } from 'react'

/** Fallback shown by an ErrorBoundary: a plain dark screen with one way out (also on Esc). */
export default function CrashScreen({
  title,
  detail,
  actionLabel,
  onAction
}: {
  title: string
  detail?: string
  actionLabel: string
  onAction: () => void
}): React.JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onAction()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onAction])

  return (
    <div className="crash-screen">
      <div className="crash-card">
        <h2>{title}</h2>
        {detail && <p className="crash-detail">{detail}</p>}
        <button className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
        <p className="crash-hint">or press Esc</p>
      </div>
    </div>
  )
}
