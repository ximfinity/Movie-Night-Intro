import { useProject } from '../../state/useProject'
import { itemColorVar, itemIcon, itemTitle } from '../../lib/itemMeta'
import VideoInspector from './VideoInspector'
import SlideInspector from './SlideInspector'
import CountdownInspector from './CountdownInspector'
import './inspectors.css'

export default function InspectorPanel(): React.JSX.Element {
  const { project, selectedItemId } = useProject()
  const item = project?.items.find((it) => it.id === selectedItemId) ?? null

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
        {item.type === 'slide' && <SlideInspector item={item} />}
        {item.type === 'countdown' && <CountdownInspector item={item} />}
      </div>
    </div>
  )
}
