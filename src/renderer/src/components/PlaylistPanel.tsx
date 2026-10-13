import { useState } from 'react'
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
import { COUNTDOWN_SELECTION_ID, FEATURE_SELECTION_ID } from '../state/context'
import { createSlideshowItem, createVideoItem, hasFeatureMovie } from '@shared/factory'
import { createTriviaItem, starterQuestions } from '@shared/trivia'
import type { CountdownConfig, FeatureConfig, PlaylistItem } from '@shared/types'
import { estimateRuntime, showtimeFit, type RuntimeEstimate } from '@shared/runtime'
import { useVideoDurations } from '../lib/videoDurations'
import { formatClockLabel, formatDuration } from '../lib/itemMeta'
import SortableItemCard from './SortableItemCard'
import { TemplatePickerDialog } from './TemplateDialogs'
import MediaLibraryPanel from './MediaLibraryPanel'
import './PlaylistPanel.css'

export default function PlaylistPanel(): React.JSX.Element {
  const { project, dir, addItem, reorderItems, selectedItemId, selectItem, importToLibrary } =
    useProject()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const [showTemplates, setShowTemplates] = useState(false)
  const { durations, pending } = useVideoDurations(dir, videoFilesOf(project?.items ?? []))

  if (!project || !dir) return <></>

  const items = project.items
  const countdown = project.countdown
  const feature = project.feature
  const runtime = estimateRuntime(items, durations)

  async function handleAddVideo(): Promise<void> {
    const files = await importToLibrary('video')
    for (const f of files) {
      addItem(createVideoItem(f.fileName, f.displayName))
    }
  }

  function handleAddSlide(): void {
    addItem(createSlideshowItem())
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
      <button
        className={`countdown-card feature-card ${selectedItemId === FEATURE_SELECTION_ID ? 'countdown-card-selected' : ''}`}
        onClick={() => selectItem(FEATURE_SELECTION_ID)}
      >
        <span className="countdown-card-icon feature-card-icon">🎞️</span>
        <div className="countdown-card-text">
          <div className="countdown-card-title">Feature Presentation</div>
          <div className="countdown-card-subtitle">{featureSummary(feature)}</div>
        </div>
      </button>

      <div className="playlist-scroll">
        <MediaLibraryPanel />

        <div className="playlist-add-row">
          <button className="btn add-btn add-video" onClick={handleAddVideo}>
            🎬 Video Clip
          </button>
          <button
            className="btn add-btn add-slide"
            onClick={handleAddSlide}
            title="A group of text or image slides that rotate, with optional music"
          >
            📝 Slide Group
          </button>
          <button
            className="btn add-btn add-trivia"
            onClick={() =>
              addItem({ ...createTriviaItem(starterQuestions()), name: 'Movie Trivia' })
            }
            title="A trivia-night round: multiple-choice questions, each followed by its answer"
          >
            🧠 Trivia
          </button>
          <button
            className="btn add-btn add-template"
            onClick={() => setShowTemplates(true)}
            title="Insert a ready-made slide group (theme nights) or one from your template library"
          >
            📚 Template
          </button>
        </div>
        {showTemplates && <TemplatePickerDialog onClose={() => setShowTemplates(false)} />}

        {items.length > 0 && (
          <RuntimeSummary runtime={runtime} pending={pending} countdown={countdown} />
        )}

        {items.length === 0 ? (
          <div className="playlist-empty">
            <p>Your playlist is empty.</p>
            <p className="playlist-empty-hint">
              Add video clips, slide groups and trivia above — the countdown overlay above plays on
              top automatically, so you don&apos;t need to add it here.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((it) => it.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="playlist-list">
                {items.map((item, index) => (
                  <SortableItemCard
                    key={item.id}
                    item={item}
                    index={index}
                    runtime={runtime.items[index]}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}

/** Every video file whose length affects the running time. */
function videoFilesOf(items: PlaylistItem[]): string[] {
  return items.flatMap((it) =>
    it.type === 'video'
      ? [it.fileName]
      : it.type === 'slideshow' && it.music?.kind === 'video' && it.music.loopSlidesUntilEnd
        ? [it.music.fileName]
        : []
  )
}

/** "Pre-show runs about 14:20", and how that lines up with the countdown. */
function RuntimeSummary({
  runtime,
  pending,
  countdown
}: {
  runtime: RuntimeEstimate
  pending: number
  countdown: CountdownConfig
}): React.JSX.Element {
  const fit = showtimeFit(runtime.totalSec, countdown)
  const failed = runtime.unknownCount - pending
  const total = formatDuration(runtime.totalSec)
  return (
    <div className="runtime-summary" aria-live="polite">
      <div className="runtime-total">
        ⏱ Pre-show runs about <strong>{total}</strong>
        {pending > 0 && <span className="runtime-note"> · measuring videos…</span>}
      </div>
      {fit?.mode === 'clock' &&
        (fit.loops ? (
          <p>
            It repeats until showtime ({formatClockLabel(fit.showtime)}). To get through it all at
            least once, start by <strong>{formatClockLabel(fit.latestStart)}</strong>.
          </p>
        ) : (
          <p>
            To finish right at showtime ({formatClockLabel(fit.showtime)}), start at{' '}
            <strong>{formatClockLabel(fit.latestStart)}</strong>.
          </p>
        ))}
      {fit?.mode === 'duration' && (
        <p>
          {fit.overSec > 0
            ? `That's ${formatDuration(fit.overSec)} longer than the ${formatDuration(fit.countdownSec)} countdown, so it keeps playing after zero.`
            : fit.overSec < 0
              ? `That ends ${formatDuration(-fit.overSec)} before the ${formatDuration(fit.countdownSec)} countdown reaches zero.`
              : `That matches the ${formatDuration(fit.countdownSec)} countdown exactly.`}
        </p>
      )}
      {failed > 0 && (
        <p className="runtime-note">
          {failed} video{failed === 1 ? '' : 's'} couldn&apos;t be measured and{' '}
          {failed === 1 ? "isn't" : "aren't"} counted.
        </p>
      )}
    </div>
  )
}

function featureSummary(feature: FeatureConfig): string {
  if (!hasFeatureMovie(feature)) return 'No movie set · pre-show only'
  const what = feature.title || (feature.source === 'stream' ? 'Streaming link' : 'Movie file')
  const start = feature.startMode === 'auto' ? 'starts automatically' : 'waits for go button'
  return `${what} · ${start}`
}
