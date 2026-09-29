import { useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type {
  ImportedMediaFile,
  OverlayPosition,
  SlideFrame,
  SlideMusicKind,
  SlideshowItem,
  TextAnimation
} from '@shared/types'
import { SUBTITLE_MAX_CHARS } from '@shared/types'
import { mediaFileUrl } from '@shared/paths'
import { RANDOM_THEME, findSlideTheme } from '@shared/slideThemes'
import { useProject } from '../../state/useProject'
import { autoGroupName, frameLabel } from '../../lib/itemMeta'
import TransitionSelect from './TransitionSelect'
import ThemeSwatches from './ThemeSwatches'
import SlidePreview from './SlidePreview'
import { SaveTemplateDialog } from '../TemplateDialogs'
import AiSubtitlesDialog from './AiSubtitlesDialog'
import MemeMakerDialog from './MemeMakerDialog'
import { aiReady } from '@shared/ai'
import { useAiConfig } from '../../lib/aiConfig'
import { usePromptCopier } from '../../hooks/usePromptCopier'

const ANIMATIONS: { value: TextAnimation; label: string }[] = [
  { value: 'fade-up', label: 'Fade up' },
  { value: 'slide-in', label: 'Slide in' },
  { value: 'zoom-in', label: 'Zoom in' },
  { value: 'typewriter', label: 'Typewriter' }
]

const POSITIONS: { value: OverlayPosition; label: string }[] = [
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'center', label: 'Bottom center' }
]

export default function SlideshowInspector({ item }: { item: SlideshowItem }): React.JSX.Element {
  const { dir, updateItem, addFrame, copiedFrame, pasteFrame, reorderFrames } = useProject()
  const [expandedId, setExpandedId] = useState(item.frames[0]?.id ?? '')
  // Everything collapses while dragging so all rows are the same height (a tall open
  // editor makes drop positions jump).
  const [dragging, setDragging] = useState(false)
  /** Open AI dialog: for the whole group, or for one slide (frameId). */
  const [memeOpen, setMemeOpen] = useState(false)
  const [aiDialog, setAiDialog] = useState<{ frameId?: string; auto?: boolean } | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const aiFrame = aiDialog?.frameId ? item.frames.find((f) => f.id === aiDialog.frameId) : undefined
  const expandedIndex = Math.max(
    0,
    item.frames.findIndex((f) => f.id === expandedId)
  )
  const expanded = item.frames[expandedIndex]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent): void {
    setDragging(false)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = item.frames.findIndex((f) => f.id === active.id)
    const to = item.frames.findIndex((f) => f.id === over.id)
    if (from !== -1 && to !== -1) reorderFrames(item.id, from, to)
  }

  function expand(id: string | null): void {
    if (id) setExpandedId(id)
  }

  return (
    <div className="slideshow-inspector">
      <div className="slideshow-settings">
        <div className="field">
          <span className="field-label">Group name</span>
          <div className="group-name-row">
            <input
              type="text"
              aria-label="Group name"
              value={item.name}
              placeholder={autoGroupName(item)}
              onChange={(e) => updateItem(item.id, { name: e.target.value })}
            />
            <button
              className="btn btn-ghost"
              onClick={() => setSavingTemplate(true)}
              title="Save this group (with its images and music) for reuse in any project"
            >
              📚 Save as template
            </button>
          </div>
        </div>
        {savingTemplate && (
          <SaveTemplateDialog
            itemId={item.id}
            defaultName={item.name.trim() || autoGroupName(item)}
            onClose={() => setSavingTemplate(false)}
          />
        )}

        <TransitionSelect
          value={item.transition}
          onChange={(transition) => updateItem(item.id, { transition })}
        />
        <p className="inspector-hint">
          Also used between slides when this group rotates through more than one.
        </p>

        <MusicSettings item={item} />

        <div className="frames-header">
          <span className="section-label">Slides ({item.frames.length})</span>
          <div className="frames-header-actions">
            <button
              className="btn btn-ghost quick-build-btn"
              onClick={() => setAiDialog({})}
              title="Add slides from a list of titles, and fill them with silly subtitles from any AI chat"
            >
              ✨ Quick build &amp; AI
            </button>
            <button className="btn btn-ghost" onClick={() => expand(addFrame(item.id, 'text'))}>
              + Text
            </button>
            <button className="btn btn-ghost" onClick={() => expand(addFrame(item.id, 'image'))}>
              + Image
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setMemeOpen(true)}
              title="Make a meme (picture + top and bottom captions) as an image slide"
            >
              + Meme
            </button>
            {copiedFrame && (
              <button
                className="btn btn-ghost"
                title={`Paste copied slide: ${frameLabel(copiedFrame)}`}
                onClick={() => expand(pasteFrame(item.id))}
              >
                + Paste
              </button>
            )}
          </div>
        </div>
        <p className="inspector-hint">
          New slides copy the look of the last one. Drag ⠿ to reorder; click a slide to edit it.
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          // Rows collapse when a drag starts, so drop targets must be re-measured live.
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={() => setDragging(true)}
          onDragCancel={() => setDragging(false)}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={item.frames.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="frame-list">
              {item.frames.map((frame, index) => (
                <FrameCard
                  key={frame.id}
                  itemId={item.id}
                  frame={frame}
                  index={index}
                  count={item.frames.length}
                  expanded={!dragging && frame.id === expanded?.id}
                  onExpand={() => setExpandedId(frame.id)}
                  onDuplicated={expand}
                  onOpenAi={(auto) => setAiDialog({ frameId: frame.id, auto })}
                  dir={dir!}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>

      {memeOpen && (
        <MemeMakerDialog
          item={item}
          onClose={() => setMemeOpen(false)}
          onCreated={(id) => setExpandedId(id)}
        />
      )}
      {aiDialog && (
        <AiSubtitlesDialog
          item={item}
          frame={aiFrame}
          autoGenerate={aiDialog.auto}
          onClose={() => setAiDialog(null)}
          onApplied={(ids) => {
            if (ids[0]) setExpandedId(ids[0])
          }}
        />
      )}

      <div className="slideshow-preview-col">
        {expanded && (
          <SlidePreview
            frame={expanded}
            dir={dir!}
            index={expandedIndex}
            count={item.frames.length}
          />
        )}
      </div>
    </div>
  )
}

function MusicSettings({ item }: { item: SlideshowItem }): React.JSX.Element {
  const { project, updateItem, importToLibrary } = useProject()
  const library = project!.library
  const music = item.music

  function applyMusic(kind: SlideMusicKind, file: ImportedMediaFile): void {
    updateItem(item.id, {
      music:
        music && music.kind === kind
          ? // Switching to another file keeps the volume, corner, size and loop settings.
            { ...music, fileName: file.fileName, displayName: file.displayName }
          : {
              kind,
              fileName: file.fileName,
              displayName: file.displayName,
              volume: 0.8,
              fadeInSec: 1.5,
              fadeOutSec: 1.5,
              position: 'bottom-left',
              sizeScale: 3,
              loopSlidesUntilEnd: false
            }
    })
  }

  async function handleImportMusic(kind: SlideMusicKind): Promise<void> {
    const files = await importToLibrary(kind === 'video' ? 'video' : 'audio')
    if (files.length > 0) applyMusic(kind, files[0])
  }

  const musicLibraryFiles = music?.kind === 'video' ? library.videos : library.audio

  return (
    <div className="field">
      <span className="section-label">Music (plays for this whole group)</span>

      {!music && (
        <>
          <div className="frame-content-toggle">
            <button className="btn frame-toggle-btn" onClick={() => handleImportMusic('audio')}>
              🎵 Audio track
            </button>
            <button className="btn frame-toggle-btn" onClick={() => handleImportMusic('video')}>
              🎬 Pop-up video
            </button>
          </div>
          <p className="inspector-hint">
            An audio track plays quietly in the background. A pop-up video plays with its picture in
            a corner box while the slides rotate.
          </p>
        </>
      )}

      {music && (
        <div className="music-settings">
          <div className="music-file-row">
            <span className="music-file-name">
              {music.kind === 'video' ? '🎬' : '🎵'} {music.displayName}
            </span>
            <button
              className="btn btn-ghost btn-danger"
              onClick={() => updateItem(item.id, { music: null })}
            >
              Remove
            </button>
          </div>

          {musicLibraryFiles.length > 0 && (
            <label className="field">
              <span className="field-label">Switch to another {music.kind} file</span>
              <select
                value={music.fileName}
                onChange={(e) => {
                  const f = musicLibraryFiles.find((x) => x.fileName === e.target.value)
                  if (f) applyMusic(music.kind, f)
                }}
              >
                {musicLibraryFiles.map((f) => (
                  <option key={f.fileName} value={f.fileName}>
                    {f.displayName}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="field">
            <span className="field-label">
              Volume <span>{Math.round(music.volume * 100)}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={music.volume}
              onChange={(e) =>
                updateItem(item.id, { music: { ...music, volume: Number(e.target.value) } })
              }
            />
          </label>

          {music.kind === 'video' && (
            <>
              <label className="field">
                <span className="field-label">Corner of the screen</span>
                <select
                  value={music.position}
                  onChange={(e) =>
                    updateItem(item.id, {
                      music: { ...music, position: e.target.value as OverlayPosition }
                    })
                  }
                >
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">
                  Size <span>{Math.round(music.sizeScale * 100)}%</span>
                </span>
                <input
                  type="range"
                  min={1}
                  max={6}
                  step={0.25}
                  value={music.sizeScale}
                  onChange={(e) =>
                    updateItem(item.id, { music: { ...music, sizeScale: Number(e.target.value) } })
                  }
                />
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={music.loopSlidesUntilEnd}
                  onChange={(e) =>
                    updateItem(item.id, {
                      music: { ...music, loopSlidesUntilEnd: e.target.checked }
                    })
                  }
                />
                Repeat the slides in a loop until the video ends
              </label>
              {music.loopSlidesUntilEnd && (
                <p className="inspector-hint">
                  The slides keep rotating for as long as the video plays, however long that is —
                  the group moves on to the next playlist item only once the video finishes.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function FrameCard({
  itemId,
  frame,
  index,
  count,
  expanded,
  onExpand,
  onDuplicated,
  onOpenAi,
  dir
}: {
  itemId: string
  frame: SlideFrame
  index: number
  count: number
  expanded: boolean
  onExpand: () => void
  onDuplicated: (id: string | null) => void
  onOpenAi: (autoGenerate?: boolean) => void
  dir: string
}): React.JSX.Element {
  const { removeFrame, copyFrame } = useProject()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: frame.id
  })
  const variations = frame.subtitleOptions.filter((s) => s.trim()).length
  const theme = frame.theme === RANDOM_THEME ? null : findSlideTheme(frame.theme)

  return (
    <li
      ref={setNodeRef}
      className={`frame-card ${expanded ? 'frame-card-expanded' : ''}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
      }}
    >
      <div className="frame-row" onClick={onExpand}>
        <button
          className="item-card-handle"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
          aria-label={`Reorder slide ${index + 1}`}
          onClick={(e) => e.stopPropagation()}
        >
          ⠿
        </button>
        <span className="frame-row-index">{index + 1}</span>
        <span
          className="frame-row-swatch"
          style={theme ? { background: theme.background } : undefined}
          title={frame.content === 'image' ? 'Image slide' : theme ? theme.label : 'Random theme'}
        >
          {frame.content === 'image' ? '🖼️' : theme ? '' : '🎲'}
        </span>
        <span className="frame-row-label">{frameLabel(frame)}</span>
        <span className="frame-row-meta">
          {frame.content === 'text' && variations > 1 ? `${variations} lines · ` : ''}
          {frame.durationSec}s
        </span>
        <span className="frame-row-actions">
          <button
            className="btn btn-ghost icon-btn"
            title="Duplicate, and copy for pasting into another group"
            onClick={(e) => {
              e.stopPropagation()
              onDuplicated(copyFrame(itemId, frame.id))
            }}
          >
            ⧉
          </button>
          <button
            className="btn btn-ghost icon-btn btn-danger"
            disabled={count === 1}
            title={
              count === 1
                ? 'A group needs at least one slide'
                : 'Remove this slide (undo with Ctrl+Z)'
            }
            onClick={(e) => {
              e.stopPropagation()
              removeFrame(itemId, frame.id)
            }}
          >
            ✕
          </button>
        </span>
      </div>
      {expanded && (
        <FrameEditor itemId={itemId} frame={frame} count={count} dir={dir} onOpenAi={onOpenAi} />
      )}
    </li>
  )
}

function FrameEditor({
  itemId,
  frame,
  count,
  dir,
  onOpenAi
}: {
  itemId: string
  frame: SlideFrame
  count: number
  dir: string
  onOpenAi: (autoGenerate?: boolean) => void
}): React.JSX.Element {
  const { updateFrame, applyStyleToGroup } = useProject()

  function patch(p: Partial<SlideFrame>): void {
    updateFrame(itemId, frame.id, p)
  }

  return (
    <div className="frame-editor">
      <div className="frame-content-toggle">
        <button
          className={`btn frame-toggle-btn ${frame.content === 'text' ? 'frame-toggle-active' : ''}`}
          onClick={() => patch({ content: 'text' })}
        >
          📝 Text
        </button>
        <button
          className={`btn frame-toggle-btn ${frame.content === 'image' ? 'frame-toggle-active' : ''}`}
          onClick={() => patch({ content: 'image' })}
        >
          🖼️ Image
        </button>
      </div>

      {frame.content === 'text' ? (
        <>
          <label className="field">
            <span className="field-label">Title</span>
            <input
              type="text"
              value={frame.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </label>
          <SubtitleEditor itemId={itemId} frame={frame} patch={patch} onOpenAi={onOpenAi} />
          <ThemeSwatches value={frame.theme} onChange={(theme) => patch({ theme })} />
          <label className="field">
            <span className="field-label">Text animation</span>
            <select
              value={frame.textAnimation}
              onChange={(e) => patch({ textAnimation: e.target.value as TextAnimation })}
            >
              {ANIMATIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <ImagePicker
            label="Optional background image or GIF"
            frame={frame}
            dir={dir}
            patch={patch}
          />
        </>
      ) : (
        <>
          <ImagePicker label="Image or GIF" frame={frame} dir={dir} patch={patch} />
          <div className="body-style-row">
            <div
              className="body-style-toggle"
              role="radiogroup"
              aria-label="How the picture fills the screen"
            >
              <button
                role="radio"
                aria-checked={frame.imageFit !== 'fit'}
                className={`btn btn-ghost ${frame.imageFit !== 'fit' ? 'body-style-active' : ''}`}
                onClick={() => patch({ imageFit: 'fill' })}
                title="Fill the screen with a slow zoom (edges may be cropped)"
              >
                Fill screen, slow zoom
              </button>
              <button
                role="radio"
                aria-checked={frame.imageFit === 'fit'}
                className={`btn btn-ghost ${frame.imageFit === 'fit' ? 'body-style-active' : ''}`}
                onClick={() => patch({ imageFit: 'fit' })}
                title="Show the whole picture, still: best for memes, QR codes and text"
              >
                Show whole picture
              </button>
            </div>
          </div>
        </>
      )}

      <label className="field">
        <span className="field-label">
          Duration on screen <span>{frame.durationSec}s</span>
        </span>
        <input
          type="range"
          min={2}
          max={30}
          step={1}
          value={frame.durationSec}
          onChange={(e) => patch({ durationSec: Number(e.target.value) })}
        />
      </label>

      {count > 1 && (
        <button
          className="btn btn-ghost apply-look-btn"
          onClick={() => applyStyleToGroup(itemId, frame.id)}
          title="Copy this slide's theme, animation and duration to every slide in the group"
        >
          Use this look for all {count} slides
        </button>
      )}
    </div>
  )
}

function SubtitleEditor({
  itemId,
  frame,
  patch,
  onOpenAi
}: {
  itemId: string
  frame: SlideFrame
  patch: (p: Partial<SlideFrame>) => void
  onOpenAi: (autoGenerate?: boolean) => void
}): React.JSX.Element {
  const { project } = useProject()
  const copyPrompt = usePromptCopier()
  const aiText = aiReady(useAiConfig()).text
  const [copied, setCopied] = useState(false)
  const item = project!.items.find((it) => it.id === itemId)
  const options = frame.subtitleOptions
  const isList = frame.bodyStyle === 'list'
  return (
    <div className="field">
      <div className="body-style-row">
        <div className="body-style-toggle" role="radiogroup" aria-label="How the lines show">
          <button
            role="radio"
            aria-checked={!isList}
            className={`btn btn-ghost ${!isList ? 'body-style-active' : ''}`}
            onClick={() => patch({ bodyStyle: 'rotate' })}
            title="Show one line under the title, a different one each time"
          >
            One line at a time
          </button>
          <button
            role="radio"
            aria-checked={isList}
            className={`btn btn-ghost ${isList ? 'body-style-active' : ''}`}
            onClick={() => patch({ bodyStyle: 'list' })}
            title="Show every line at once: a menu, sponsor list or schedule"
          >
            All lines as a list
          </button>
        </div>
        {!isList && (
          <select
            className="ai-kind-select"
            value={frame.aiKind}
            title="What the AI prompt asks for on this slide"
            onChange={(e) => patch({ aiKind: e.target.value as SlideFrame['aiKind'] })}
          >
            <option value="jokes">AI writes: silly lines</option>
            <option value="trivia">AI writes: movie trivia</option>
          </select>
        )}
      </div>
      <span className="field-label">
        {isList ? 'Lines' : 'Subtitle'}{' '}
        {isList ? (
          <span>“Popcorn | $2” shows as a price column</span>
        ) : (
          options.length > 1 && <span>one of {options.length} picked at random each time</span>
        )}
      </span>
      {options.map((option, i) => (
        <div className="subtitle-option" key={i}>
          <div className="subtitle-option-row">
            <textarea
              rows={1}
              value={option}
              placeholder={
                isList
                  ? 'e.g. Popcorn | $2'
                  : options.length > 1
                    ? `Variation ${i + 1}`
                    : 'Optional line under the title'
              }
              onChange={(e) => {
                const next = [...options]
                next[i] = e.target.value
                patch({ subtitleOptions: next })
              }}
            />
            <button
              className="btn btn-ghost icon-btn btn-danger"
              disabled={options.length <= 1}
              title="Remove this variation"
              onClick={() => patch({ subtitleOptions: options.filter((_, idx) => idx !== i) })}
            >
              ✕
            </button>
          </div>
          {!isList && option.length > SUBTITLE_MAX_CHARS && (
            <span className="char-warning">
              {option.length}/{SUBTITLE_MAX_CHARS} characters — may wrap onto a second line
            </span>
          )}
        </div>
      ))}
      <div className="subtitle-actions">
        <button
          className="btn btn-ghost"
          onClick={() => patch({ subtitleOptions: [...options, ''] })}
        >
          {isList ? '+ Add line' : '+ Add variation'}
        </button>
        {!isList && (
          <>
            <button
              className="btn btn-ghost"
              disabled={!frame.title.trim() || item?.type !== 'slideshow'}
              title="Copy a ready-made prompt for this title — paste it into any AI chat"
              onClick={() => {
                if (item?.type !== 'slideshow') return
                copyPrompt(item, frame)
                setCopied(true)
                setTimeout(() => setCopied(false), 3000)
              }}
            >
              {copied ? '✓ Prompt copied' : '📋 Copy AI prompt'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => onOpenAi()}
              title="Paste an AI chat's reply (or any list of lines) as variations"
            >
              📥 Paste AI reply
            </button>
            {aiText && (
              <button
                className="btn btn-ghost ai-write-more"
                disabled={!frame.title.trim()}
                title="Ask your connected AI for more lines for this slide (you review them first)"
                onClick={() => onOpenAi(true)}
              >
                ✨ Write more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ImagePicker({
  label,
  frame,
  dir,
  patch
}: {
  label: string
  frame: SlideFrame
  dir: string
  patch: (p: Partial<SlideFrame>) => void
}): React.JSX.Element {
  const { project, importToLibrary } = useProject()
  const images = project!.library.images

  function applyImage(file: ImportedMediaFile): void {
    patch({ backgroundImage: file.fileName, backgroundImageDisplayName: file.displayName })
  }

  async function handleImportImage(): Promise<void> {
    const files = await importToLibrary('image')
    if (files.length > 0) applyImage(files[0])
  }

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {frame.backgroundImage ? (
        <div className="media-preview">
          <img src={mediaFileUrl(dir, 'image', frame.backgroundImage)} alt="" />
          <span className="media-preview-name">{frame.backgroundImageDisplayName}</span>
          <button
            className="btn btn-ghost btn-danger"
            onClick={() => patch({ backgroundImage: null, backgroundImageDisplayName: null })}
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="picker-row">
          <button className="btn" onClick={handleImportImage}>
            + Import new
          </button>
          {images.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                const f = images.find((x) => x.fileName === e.target.value)
                if (f) applyImage(f)
              }}
            >
              <option value="" disabled>
                From library…
              </option>
              {images.map((f) => (
                <option key={f.fileName} value={f.fileName}>
                  {f.displayName}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  )
}
