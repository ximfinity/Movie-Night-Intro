import type {
  ImportedMediaFile,
  OverlayPosition,
  SlideFrame,
  SlideMusicKind,
  SlideshowItem,
  TextAnimation
} from '@shared/types'
import { mediaFileUrl } from '@shared/paths'
import { RANDOM_THEME, SLIDE_THEMES } from '@shared/slideThemes'
import { useProject } from '../../state/useProject'
import TransitionSelect from './TransitionSelect'

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
  const { dir, project, updateItem, importToLibrary, addFrame, copiedFrame, pasteFrame } =
    useProject()
  const library = project!.library

  function applyMusic(kind: SlideMusicKind, file: ImportedMediaFile): void {
    updateItem(item.id, {
      music: {
        kind,
        fileName: file.fileName,
        displayName: file.displayName,
        volume: 0.8,
        fadeInSec: 1.5,
        fadeOutSec: 1.5,
        position: 'bottom-left',
        loopSlidesUntilEnd: false
      }
    })
  }

  async function handleImportMusic(kind: SlideMusicKind): Promise<void> {
    const files = await importToLibrary(kind === 'video' ? 'video' : 'audio')
    if (files.length > 0) applyMusic(kind, files[0])
  }

  const musicLibraryFiles = item.music?.kind === 'video' ? library.videos : library.audio

  return (
    <div>
      <TransitionSelect
        value={item.transition}
        onChange={(transition) => updateItem(item.id, { transition })}
      />
      <p className="inspector-hint">
        Also used between slides when this group rotates through more than one.
      </p>

      <div className="field">
        <span className="field-label">Music (plays for this whole group)</span>

        {!item.music && (
          <div className="frame-content-toggle">
            <button className="btn frame-toggle-btn" onClick={() => handleImportMusic('audio')}>
              🎵 Audio track
            </button>
            <button className="btn frame-toggle-btn" onClick={() => handleImportMusic('video')}>
              🎬 Pop-up video
            </button>
          </div>
        )}

        {item.music ? (
          <div className="music-settings">
            <div className="music-file-row">
              <span className="music-file-name">
                {item.music.kind === 'video' ? '🎬' : '🎵'} {item.music.displayName}
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
                <span className="field-label">Switch to another {item.music.kind} file</span>
                <select
                  value={item.music.fileName}
                  onChange={(e) => {
                    const f = musicLibraryFiles.find((x) => x.fileName === e.target.value)
                    if (f) applyMusic(item.music!.kind, f)
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
                Volume <span>{Math.round(item.music.volume * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={item.music.volume}
                onChange={(e) =>
                  updateItem(item.id, { music: { ...item.music!, volume: Number(e.target.value) } })
                }
              />
            </label>

            {item.music.kind === 'video' && (
              <>
                <label className="field">
                  <span className="field-label">Corner of the screen</span>
                  <select
                    value={item.music.position}
                    onChange={(e) =>
                      updateItem(item.id, {
                        music: { ...item.music!, position: e.target.value as OverlayPosition }
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

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={item.music.loopSlidesUntilEnd}
                    onChange={(e) =>
                      updateItem(item.id, {
                        music: { ...item.music!, loopSlidesUntilEnd: e.target.checked }
                      })
                    }
                  />
                  Repeat the slides in a loop until the video ends
                </label>
                {item.music.loopSlidesUntilEnd && (
                  <p className="inspector-hint">
                    The slides above keep rotating for as long as the video plays, however long that
                    is — the group moves on to the next playlist item only once the video finishes.
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <p className="inspector-hint">
            An audio track plays quietly in the background. A pop-up video plays with its picture in
            a small corner box, like a pop-up video, while the slides rotate.
          </p>
        )}
      </div>

      <div className="frames-header">
        <span className="field-label">Slides in this group ({item.frames.length})</span>
        <div className="frames-header-actions">
          <button className="btn btn-ghost" onClick={() => addFrame(item.id, 'text')}>
            + Text
          </button>
          <button className="btn btn-ghost" onClick={() => addFrame(item.id, 'image')}>
            + Image
          </button>
          {copiedFrame && (
            <button
              className="btn btn-ghost"
              title={`Paste copied slide: ${copiedFrame.title || copiedFrame.backgroundImageDisplayName || 'slide'}`}
              onClick={() => pasteFrame(item.id)}
            >
              + Paste
            </button>
          )}
        </div>
      </div>

      {item.frames.map((frame, index) => (
        <FrameEditor
          key={frame.id}
          itemId={item.id}
          frame={frame}
          index={index}
          count={item.frames.length}
          dir={dir!}
        />
      ))}
    </div>
  )
}

function FrameEditor({
  itemId,
  frame,
  index,
  count,
  dir
}: {
  itemId: string
  frame: SlideFrame
  index: number
  count: number
  dir: string
}): React.JSX.Element {
  const { project, updateFrame, removeFrame, moveFrame, copyFrame, importToLibrary } = useProject()
  const library = project!.library

  function patch(p: Partial<SlideFrame>): void {
    updateFrame(itemId, frame.id, p)
  }

  function applyImage(file: ImportedMediaFile): void {
    patch({ backgroundImage: file.fileName, backgroundImageDisplayName: file.displayName })
  }

  async function handleImportImage(): Promise<void> {
    const files = await importToLibrary('image')
    if (files.length > 0) applyImage(files[0])
  }

  return (
    <div className="frame-editor">
      <div className="frame-editor-header">
        <span className="frame-editor-index">Slide {index + 1}</span>
        <div className="frame-editor-controls">
          <button
            className="btn btn-ghost icon-btn"
            disabled={index === 0}
            title="Move up"
            onClick={() => moveFrame(itemId, frame.id, 'up')}
          >
            ▲
          </button>
          <button
            className="btn btn-ghost icon-btn"
            disabled={index === count - 1}
            title="Move down"
            onClick={() => moveFrame(itemId, frame.id, 'down')}
          >
            ▼
          </button>
          <button
            className="btn btn-ghost icon-btn"
            title="Duplicate, and copy for reuse in another slideshow"
            onClick={() => copyFrame(itemId, frame.id)}
          >
            ⧉
          </button>
          <button
            className="btn btn-ghost icon-btn btn-danger"
            disabled={count === 1}
            title="Remove this slide"
            onClick={() => removeFrame(itemId, frame.id)}
          >
            ✕
          </button>
        </div>
      </div>

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
          <div className="field">
            <span className="field-label">
              Body text{' '}
              {frame.subtitleOptions.length > 1 &&
                '(one is picked at random each time this slide shows)'}
            </span>
            {frame.subtitleOptions.map((option, i) => (
              <div className="subtitle-option-row" key={i}>
                <textarea
                  rows={2}
                  value={option}
                  placeholder={frame.subtitleOptions.length > 1 ? `Option ${i + 1}` : ''}
                  onChange={(e) => {
                    const next = [...frame.subtitleOptions]
                    next[i] = e.target.value
                    patch({ subtitleOptions: next })
                  }}
                />
                <button
                  className="btn btn-ghost icon-btn btn-danger"
                  disabled={frame.subtitleOptions.length <= 1}
                  title="Remove this option"
                  onClick={() =>
                    patch({ subtitleOptions: frame.subtitleOptions.filter((_, idx) => idx !== i) })
                  }
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              className="btn btn-ghost"
              onClick={() => patch({ subtitleOptions: [...frame.subtitleOptions, ''] })}
            >
              + Add random variation
            </button>
          </div>
          <label className="field">
            <span className="field-label">Theme</span>
            <select value={frame.theme} onChange={(e) => patch({ theme: e.target.value })}>
              <option value={RANDOM_THEME}>🎲 Random each time</option>
              {SLIDE_THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
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
          <div className="field">
            <span className="field-label">Optional background image or GIF</span>
            {frame.backgroundImage && dir ? (
              <div className="media-preview">
                <img src={mediaFileUrl(dir, 'image', frame.backgroundImage)} alt="" />
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
                {library.images.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      const f = library.images.find((x) => x.fileName === e.target.value)
                      if (f) applyImage(f)
                    }}
                  >
                    <option value="" disabled>
                      From library…
                    </option>
                    {library.images.map((f) => (
                      <option key={f.fileName} value={f.fileName}>
                        {f.displayName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="field">
          <span className="field-label">Image or GIF</span>
          {frame.backgroundImage && dir ? (
            <div className="media-preview">
              <img src={mediaFileUrl(dir, 'image', frame.backgroundImage)} alt="" />
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
              {library.images.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    const f = library.images.find((x) => x.fileName === e.target.value)
                    if (f) applyImage(f)
                  }}
                >
                  <option value="" disabled>
                    From library…
                  </option>
                  {library.images.map((f) => (
                    <option key={f.fileName} value={f.fileName}>
                      {f.displayName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
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
    </div>
  )
}
