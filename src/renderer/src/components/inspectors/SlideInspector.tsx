import type { SlideItem, SlideTheme, TextAnimation } from '@shared/types'
import { mediaFileUrl } from '@shared/paths'
import { useProject } from '../../state/useProject'
import TransitionSelect from './TransitionSelect'

const THEMES: { value: SlideTheme; label: string }[] = [
  { value: 'midnight', label: 'Midnight (navy & gold)' },
  { value: 'sunset', label: 'Sunset (orange & pink)' },
  { value: 'popcorn', label: 'Popcorn (red & cream)' },
  { value: 'classic', label: 'Classic (black & white)' }
]

const ANIMATIONS: { value: TextAnimation; label: string }[] = [
  { value: 'fade-up', label: 'Fade up' },
  { value: 'slide-in', label: 'Slide in' },
  { value: 'zoom-in', label: 'Zoom in' },
  { value: 'typewriter', label: 'Typewriter' }
]

export default function SlideInspector({ item }: { item: SlideItem }): React.JSX.Element {
  const { dir, updateItem } = useProject()

  async function handlePickImage(): Promise<void> {
    const files = await window.api.importMedia(dir!, 'image')
    if (files.length === 0) return
    updateItem(item.id, {
      backgroundImage: files[0].fileName,
      backgroundImageDisplayName: files[0].displayName
    })
  }

  async function handlePickMusic(): Promise<void> {
    const files = await window.api.importMedia(dir!, 'audio')
    if (files.length === 0) return
    updateItem(item.id, {
      music: {
        fileName: files[0].fileName,
        displayName: files[0].displayName,
        volume: 0.8,
        fadeInSec: 1.5,
        fadeOutSec: 1.5,
        continueToNext: false
      }
    })
  }

  return (
    <div>
      <label className="field">
        <span className="field-label">Title</span>
        <input
          type="text"
          value={item.title}
          onChange={(e) => updateItem(item.id, { title: e.target.value })}
        />
      </label>

      <label className="field">
        <span className="field-label">Body text</span>
        <textarea
          rows={3}
          value={item.subtitle}
          onChange={(e) => updateItem(item.id, { subtitle: e.target.value })}
        />
      </label>

      <label className="field">
        <span className="field-label">Theme</span>
        <select
          value={item.theme}
          onChange={(e) => updateItem(item.id, { theme: e.target.value as SlideTheme })}
        >
          {THEMES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">Text animation</span>
        <select
          value={item.textAnimation}
          onChange={(e) => updateItem(item.id, { textAnimation: e.target.value as TextAnimation })}
        >
          {ANIMATIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">
          Duration on screen <span>{item.durationSec}s</span>
        </span>
        <input
          type="range"
          min={2}
          max={30}
          step={1}
          value={item.durationSec}
          onChange={(e) => updateItem(item.id, { durationSec: Number(e.target.value) })}
        />
      </label>

      <TransitionSelect
        value={item.transition}
        onChange={(transition) => updateItem(item.id, { transition })}
      />

      <div className="field">
        <span className="field-label">Background image</span>
        {item.backgroundImage && dir ? (
          <div className="media-preview">
            <img src={mediaFileUrl(dir, 'image', item.backgroundImage)} alt="" />
            <button
              className="btn btn-ghost btn-danger"
              onClick={() =>
                updateItem(item.id, { backgroundImage: null, backgroundImageDisplayName: null })
              }
            >
              Remove
            </button>
          </div>
        ) : (
          <button className="btn" onClick={handlePickImage}>
            + Choose image
          </button>
        )}
      </div>

      <div className="field">
        <span className="field-label">Background music</span>
        {item.music ? (
          <div className="music-settings">
            <div className="music-file-row">
              <span className="music-file-name">🎵 {item.music.displayName}</span>
              <button
                className="btn btn-ghost btn-danger"
                onClick={() => updateItem(item.id, { music: null })}
              >
                Remove
              </button>
            </div>
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
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={item.music.continueToNext}
                onChange={(e) =>
                  updateItem(item.id, {
                    music: { ...item.music!, continueToNext: e.target.checked }
                  })
                }
              />
              Keep playing into the next item (don&apos;t fade out here)
            </label>
          </div>
        ) : (
          <button className="btn" onClick={handlePickMusic}>
            + Choose music track
          </button>
        )}
      </div>
    </div>
  )
}
