export default function ShowHud({
  paused,
  message
}: {
  paused: boolean
  /** A short-lived note, e.g. "Volume 70%" or "Press Esc again to stop the movie". */
  message: string | null
}): React.JSX.Element | null {
  if (!paused && !message) return null
  return (
    <div className="show-hud">
      {message && <div className="show-paused-badge">{message}</div>}
      {paused && <div className="show-paused-badge">⏸ Paused</div>}
    </div>
  )
}
