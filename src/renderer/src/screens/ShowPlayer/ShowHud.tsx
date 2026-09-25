export default function ShowHud({ paused }: { paused: boolean }): React.JSX.Element | null {
  if (!paused) return null
  return (
    <div className="show-hud">
      <div className="show-paused-badge">⏸ Paused</div>
    </div>
  )
}
