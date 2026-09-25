import type { CountdownConfig, CountdownMode, CountdownStyle, OverlayPosition } from '@shared/types'
import { useProject } from '../../state/useProject'
import { formatDuration } from '../../lib/itemMeta'

const MODES: { value: CountdownMode; label: string; hint: string }[] = [
  {
    value: 'clock',
    label: 'Target start time',
    hint: 'Counts down to a specific time of day. Stays accurate no matter how many times the show is stopped and restarted — recommended.'
  },
  {
    value: 'duration',
    label: 'Fixed duration',
    hint: 'Counts down a fixed length starting from whenever the show is started — restarting the show resets it back to the full time.'
  }
]

const STYLES: { value: CountdownStyle; label: string }[] = [
  { value: 'ring', label: 'Progress ring' },
  { value: 'flip', label: 'Flip clock' },
  { value: 'pulse', label: 'Pulsing numbers' }
]

const POSITIONS: { value: OverlayPosition; label: string }[] = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'center', label: 'Top center' }
]

export default function CountdownInspector({
  config
}: {
  config: CountdownConfig
}): React.JSX.Element {
  const { updateCountdown } = useProject()

  const minutes = Math.floor(config.durationSec / 60)
  const seconds = config.durationSec % 60

  return (
    <div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => updateCountdown({ enabled: e.target.checked })}
        />
        Show the countdown overlay during the show
      </label>

      <p className="inspector-hint">
        Unlike video clips and slides, the countdown isn&apos;t a step in the playlist — it&apos;s a
        small overlay that stays on screen over everything else, from the moment the show starts
        until it reaches zero.
      </p>

      <label className="field">
        <span className="field-label">Label (shown above the timer)</span>
        <input
          type="text"
          value={config.label}
          onChange={(e) => updateCountdown({ label: e.target.value })}
        />
      </label>

      <label className="field">
        <span className="field-label">Countdown to</span>
        <select
          value={config.mode}
          onChange={(e) => updateCountdown({ mode: e.target.value as CountdownMode })}
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <p className="inspector-hint">{MODES.find((m) => m.value === config.mode)!.hint}</p>

      {config.mode === 'clock' ? (
        <label className="field">
          <span className="field-label">Target time (today)</span>
          <input
            type="time"
            value={config.targetTime}
            onChange={(e) => updateCountdown({ targetTime: e.target.value })}
          />
        </label>
      ) : (
        <>
          <div className="duration-row">
            <label className="field">
              <span className="field-label">Minutes</span>
              <input
                type="number"
                min={0}
                max={180}
                value={minutes}
                onChange={(e) =>
                  updateCountdown({ durationSec: Number(e.target.value) * 60 + seconds })
                }
              />
            </label>
            <label className="field">
              <span className="field-label">Seconds</span>
              <input
                type="number"
                min={0}
                max={59}
                value={seconds}
                onChange={(e) =>
                  updateCountdown({ durationSec: minutes * 60 + Number(e.target.value) })
                }
              />
            </label>
          </div>
          <p className="inspector-hint">Total: {formatDuration(config.durationSec)}</p>
        </>
      )}

      <label className="field">
        <span className="field-label">Style</span>
        <select
          value={config.style}
          onChange={(e) => updateCountdown({ style: e.target.value as CountdownStyle })}
        >
          {STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">Screen position</span>
        <select
          value={config.position}
          onChange={(e) => updateCountdown({ position: e.target.value as OverlayPosition })}
        >
          {POSITIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">Message when it hits zero</span>
        <input
          type="text"
          value={config.completeLabel}
          onChange={(e) => updateCountdown({ completeLabel: e.target.value })}
        />
      </label>

      <label className="field">
        <span className="field-label">
          Hold that message for <span>{config.holdAtZeroSec}s</span>
        </span>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={config.holdAtZeroSec}
          onChange={(e) => updateCountdown({ holdAtZeroSec: Number(e.target.value) })}
        />
      </label>
    </div>
  )
}
