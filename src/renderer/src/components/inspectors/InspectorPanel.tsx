import { useProject } from '../../state/useProject'
import { COUNTDOWN_SELECTION_ID } from '../../state/context'
import { itemColorVar, itemIcon, itemTitle } from '../../lib/itemMeta'
import VideoInspector from './VideoInspector'
import SlideshowInspector from './SlideshowInspector'
import CountdownInspector from './CountdownInspector'
import './inspectors.css'

export default function InspectorPanel(): React.JSX.Element {
  const { project, selectedItemId } = useProject()

  if (!project) {
    return (
      <div className="inspector-panel inspector-empty">
        <p>Select an item on the left to edit its settings.</p>
      </div>
    )
  }

  if (selectedItemId === COUNTDOWN_SELECTION_ID) {
    return (
      <div className="inspector-panel">
        <div className="inspector-header">
          <span className="inspector-icon" style={{ background: 'var(--countdown-color)' }}>
            ⏱️
          </span>
          <div>
            <div className="inspector-title">Countdown Overlay</div>
            <div className="inspector-type">show-wide setting</div>
          </div>
        </div>
        <div className="inspector-body">
          <CountdownInspector config={project.countdown} />
        </div>
      </div>
    )
  }

  const item = project.items.find((it) => it.id === selectedItemId) ?? null

  if (!item) {
    return (
      <div className="inspector-panel inspector-empty">
        <p>Select an item on the left to edit its settings.</p>
      </div>
    )
  }

  return (
    <div className="inspector-panel">
      <div className="inspector-header">
        <span className="inspector-icon" style={{ background: itemColorVar(item.type) }}>
          {itemIcon(item.type)}
        </span>
        <div>
          <div className="inspector-title">{itemTitle(item)}</div>
          <div className="inspector-type">{item.type} item</div>
        </div>
      </div>
      <div className="inspector-body">
        {item.type === 'video' && <VideoInspector item={item} />}
        {item.type === 'slideshow' && <SlideshowInspector item={item} />}
      </div>
    </div>
  )
}
