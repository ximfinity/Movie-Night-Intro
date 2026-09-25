import type { VideoItem } from '@shared/types'
import { useProject } from '../../state/useProject'
import TransitionSelect from './TransitionSelect'

export default function VideoInspector({ item }: { item: VideoItem }): React.JSX.Element {
  const { updateItem } = useProject()

  return (
    <div>
      <label className="field">
        <span className="field-label">File</span>
        <input type="text" value={item.displayName} readOnly />
      </label>

      <label className="field">
        <span className="field-label">
          Volume <span>{Math.round(item.volume * 100)}%</span>
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={item.volume}
          onChange={(e) => updateItem(item.id, { volume: Number(e.target.value) })}
        />
      </label>

      <TransitionSelect
        value={item.transition}
        onChange={(transition) => updateItem(item.id, { transition })}
      />

      <p className="inspector-hint">
        Clips play at their native length and volume, then automatically advance to the next item.
      </p>
    </div>
  )
}
