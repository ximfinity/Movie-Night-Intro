import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PlaylistItem } from '@shared/types'
import { useProject } from '../state/useProject'
import { itemColorVar, itemIcon, itemSubtitle, itemTitle } from '../lib/itemMeta'
import './SortableItemCard.css'

export default function SortableItemCard({
  item,
  index
}: {
  item: PlaylistItem
  index: number
}): React.JSX.Element {
  const { selectedItemId, selectItem, removeItem, duplicateItem } = useProject()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const selected = selectedItemId === item.id

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`item-card ${selected ? 'item-card-selected' : ''}`}
      onClick={() => selectItem(item.id)}
    >
      <span className="item-card-index">{index + 1}</span>
      <button className="item-card-handle" {...attributes} {...listeners} title="Drag to reorder">
        ⠿
      </button>
      <span className="item-card-icon" style={{ background: itemColorVar(item.type) }}>
        {itemIcon(item.type)}
      </span>
      <div className="item-card-text">
        <div className="item-card-title">{itemTitle(item)}</div>
        <div className="item-card-subtitle">{itemSubtitle(item)}</div>
      </div>
      <div className="item-card-actions">
        <button
          className="btn btn-ghost icon-btn"
          title="Duplicate"
          onClick={(e) => {
            e.stopPropagation()
            duplicateItem(item.id)
          }}
        >
          ⧉
        </button>
        <button
          className="btn btn-ghost icon-btn btn-danger"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation()
            removeItem(item.id)
          }}
        >
          ✕
        </button>
      </div>
    </li>
  )
}
