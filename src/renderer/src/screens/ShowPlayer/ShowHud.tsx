export default function ShowHud({ paused }: { paused: boolean }): React.JSX.Element {
  return (
    <div className="show-hud">
      {paused && <div className="show-paused-badge">⏸ Paused</div>}
      <div className="show-hud-hints">Esc exit · Space pause · ← → skip</div>
    </div>
  )
}
