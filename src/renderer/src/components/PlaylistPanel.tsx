import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useProject } from '../state/useProject'
import { createCountdownItem, createSlideItem, createVideoItem } from '@shared/factory'
import SortableItemCard from './SortableItemCard'
import './PlaylistPanel.css'

export default function PlaylistPanel(): React.JSX.Element {
  const { project, dir, addItem, reorderItems } = useProject()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  if (!project || !dir) return <></>

  const items = project.items

  async function handleAddVideo(): Promise<void> {
    const files = await window.api.importMedia(dir!, 'video')
    for (const f of files) {
      addItem(createVideoItem(f.fileName, f.displayName))
    }
  }

  function handleAddSlide(): void {
    addItem(createSlideItem())
  }

  function handleAddCountdown(): void {
    addItem(createCountdownItem())
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = items.findIndex((it) => it.id === active.id)
    const toIndex = items.findIndex((it) => it.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return
    reorderItems(fromIndex, toIndex)
  }

  return (
    <div className="playlist-panel">
      <div className="playlist-add-row">
        <button className="btn add-btn add-video" onClick={handleAddVideo}>
          🎬 Video Clip
        </button>
        <button className="btn add-btn add-slide" onClick={handleAddSlide}>
          📝 Text Slide
        </button>
        <button className="btn add-btn add-countdown" onClick={handleAddCountdown}>
          ⏱️ Countdown
        </button>
      </div>

      {items.length === 0 ? (
        <div className="playlist-empty">
          <p>Your playlist is empty.</p>
          <p className="playlist-empty-hint">
            Add a countdown timer to open the show, then mix in video clips and announcement slides
            below.
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
            <ul className="playlist-list">
              {items.map((item, index) => (
                <SortableItemCard key={item.id} item={item} index={index} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
