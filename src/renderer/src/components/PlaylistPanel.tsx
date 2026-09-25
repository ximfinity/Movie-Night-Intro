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
import { COUNTDOWN_SELECTION_ID } from '../state/context'
import { createSlideItem, createVideoItem } from '@shared/factory'
import { formatClockLabel, formatDuration } from '../lib/itemMeta'
import SortableItemCard from './SortableItemCard'
import MediaLibraryPanel from './MediaLibraryPanel'
import './PlaylistPanel.css'

export default function PlaylistPanel(): React.JSX.Element {
  const { project, dir, addItem, reorderItems, selectedItemId, selectItem, importToLibrary } =
    useProject()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  if (!project || !dir) return <></>

  const items = project.items
  const countdown = project.countdown

  async function handleAddVideo(): Promise<void> {
    const files = await importToLibrary('video')
    for (const f of files) {
      addItem(createVideoItem(f.fileName, f.displayName))
    }
  }

  function handleAddSlide(): void {
    addItem(createSlideItem())
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
      <button
        className={`countdown-card ${selectedItemId === COUNTDOWN_SELECTION_ID ? 'countdown-card-selected' : ''}`}
        onClick={() => selectItem(COUNTDOWN_SELECTION_ID)}
      >
        <span className="countdown-card-icon">⏱️</span>
        <div className="countdown-card-text">
          <div className="countdown-card-title">Countdown Overlay</div>
          <div className="countdown-card-subtitle">
            {countdown.enabled
              ? `On · ${countdown.mode === 'clock' ? formatClockLabel(countdown.targetTime) : formatDuration(countdown.durationSec)} · ${countdown.position.replace('-', ' ')}`
              : 'Off'}
          </div>
        </div>
      </button>

      <MediaLibraryPanel />

      <div className="playlist-add-row">
        <button className="btn add-btn add-video" onClick={handleAddVideo}>
          🎬 Video Clip
        </button>
        <button className="btn add-btn add-slide" onClick={handleAddSlide}>
          📝 Text Slide
        </button>
      </div>

      {items.length === 0 ? (
        <div className="playlist-empty">
          <p>Your playlist is empty.</p>
          <p className="playlist-empty-hint">
            Add video clips and announcement slides below — the countdown overlay above plays on top
            automatically, so you don&apos;t need to add it here.
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
