import type { TransitionStyle } from '@shared/types'

const OPTIONS: { value: TransitionStyle; label: string }[] = [
  { value: 'crossfade', label: 'Crossfade' },
  { value: 'slide-left', label: 'Slide from right' },
  { value: 'slide-up', label: 'Slide up' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'none', label: 'Hard cut' }
]

export default function TransitionSelect({
  value,
  onChange
}: {
  value: TransitionStyle
  onChange: (v: TransitionStyle) => void
}): React.JSX.Element {
  return (
    <label className="field">
      <span className="field-label">Transition in</span>
      <select value={value} onChange={(e) => onChange(e.target.value as TransitionStyle)}>
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}
