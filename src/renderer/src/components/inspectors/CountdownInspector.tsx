import type { CountdownItem, CountdownStyle } from '@shared/types'
import { useProject } from '../../state/useProject'
import { formatDuration } from '../../lib/itemMeta'
import TransitionSelect from './TransitionSelect'

const STYLES: { value: CountdownStyle; label: string }[] = [
  { value: 'ring', label: 'Progress ring' },
  { value: 'flip', label: 'Flip clock' },
  { value: 'pulse', label: 'Pulsing numbers' }
]

export default function CountdownInspector({ item }: { item: CountdownItem }): React.JSX.Element {
  const { updateItem } = useProject()

  const minutes = Math.floor(item.durationSec / 60)
  const seconds = item.durationSec % 60

  return (
    <div>
      <label className="field">
        <span className="field-label">Label (shown above the timer)</span>
        <input
          type="text"
          value={item.label}
          onChange={(e) => updateItem(item.id, { label: e.target.value })}
        />
      </label>

      <div className="duration-row">
        <label className="field">
          <span className="field-label">Minutes</span>
          <input
            type="number"
            min={0}
            max={180}
            value={minutes}
            onChange={(e) =>
              updateItem(item.id, {
                durationSec: Number(e.target.value) * 60 + seconds
              })
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
              updateItem(item.id, {
                durationSec: minutes * 60 + Number(e.target.value)
              })
            }
          />
        </label>
      </div>
      <p className="inspector-hint">Total: {formatDuration(item.durationSec)}</p>

      <label className="field">
        <span className="field-label">Style</span>
        <select
          value={item.style}
          onChange={(e) => updateItem(item.id, { style: e.target.value as CountdownStyle })}
        >
          {STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">Message when it hits zero</span>
        <input
          type="text"
          value={item.completeLabel}
          onChange={(e) => updateItem(item.id, { completeLabel: e.target.value })}
        />
      </label>

      <label className="field">
        <span className="field-label">
          Hold that message for <span>{item.holdAtZeroSec}s</span>
        </span>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={item.holdAtZeroSec}
          onChange={(e) => updateItem(item.id, { holdAtZeroSec: Number(e.target.value) })}
        />
      </label>

      <TransitionSelect
        value={item.transition}
        onChange={(transition) => updateItem(item.id, { transition })}
      />

      <p className="inspector-hint">
        On show night, this screen starts counting down the moment the show reaches it — perfect as
        the very first item in your playlist.
      </p>
    </div>
  )
}
