import { useEffect, useState } from 'react'
import type {
  FeatureConfig,
  MediaKind,
  MoviePlayer,
  MovieSource,
  MovieStartMode,
  MovieTransition
} from '@shared/types'
import { formatTimecode } from '@shared/countdown'
import { libraryKey, mediaFileUrl } from '@shared/paths'
import { useProject } from '../../state/useProject'
import { itemTitle } from '../../lib/itemMeta'

function fileNameOf(path: string): string {
  return path.split(/[\\/]/).pop() || path
}

function Toggle<T extends string>({
  value,
  options,
  onChange
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}): React.JSX.Element {
  return (
    <div className="frame-content-toggle" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          className={`btn frame-toggle-btn ${value === o.value ? 'frame-toggle-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Choose a file from the project's media library (or import one) for a feature setting. */
function LibraryPicker({
  kind,
  label,
  value,
  onChange,
  noneLabel = 'None'
}: {
  kind: MediaKind
  label: string
  value: string | null
  onChange: (fileName: string | null) => void
  noneLabel?: string
}): React.JSX.Element {
  const { project, dir, importToLibrary } = useProject()
  const files = project!.library[libraryKey(kind)]
  const current = files.find((f) => f.fileName === value)

  async function handleImport(): Promise<void> {
    const imported = await importToLibrary(kind)
    if (imported.length > 0) onChange(imported[0].fileName)
  }

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {value && kind === 'image' && (
        <div className="media-preview">
          <img src={mediaFileUrl(dir!, 'image', value)} alt="" />
          <span className="media-preview-name">{current?.displayName ?? value}</span>
          <button className="btn btn-ghost btn-danger" onClick={() => onChange(null)}>
            Remove
          </button>
        </div>
      )}
      {!(value && kind === 'image') && (
        <div className="picker-row">
          <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
            <option value="">{noneLabel}</option>
            {files.map((f) => (
              <option key={f.fileName} value={f.fileName}>
                {f.displayName}
              </option>
            ))}
            {value && !current && <option value={value}>{value} (missing)</option>}
          </select>
          <button className="btn" onClick={handleImport}>
            + Import
          </button>
        </div>
      )}
    </div>
  )
}

function GroupPicker({
  label,
  value,
  onChange
}: {
  label: string
  value: string | null
  onChange: (id: string | null) => void
}): React.JSX.Element {
  const { project } = useProject()
  const groups = project!.items.filter((it) => it.type === 'slideshow')
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">None: theater curtains</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {itemTitle(g)}
          </option>
        ))}
      </select>
    </label>
  )
}

function MovieFileSettings({
  feature,
  onResumeMovie
}: {
  feature: FeatureConfig
  onResumeMovie: (atSec: number) => void
}): React.JSX.Element {
  const { updateFeature } = useProject()
  const [exists, setExists] = useState<boolean | null>(null)
  const [resumeAt, setResumeAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!feature.filePath) return
    window.api.fileExists(feature.filePath).then((ok) => !cancelled && setExists(ok))
    window.api.getResumePoint(feature.filePath).then((point) => {
      if (cancelled || !point) return
      const recent = Date.now() - Date.parse(point.savedAt) < 48 * 3600_000
      const worthIt =
        point.positionSec > 30 && (!point.durationSec || point.positionSec < point.durationSec - 60)
      setResumeAt(recent && worthIt ? point.positionSec : null)
    })
    return () => {
      cancelled = true
    }
  }, [feature.filePath])

  async function pickMovie(): Promise<void> {
    const path = await window.api.pickMovieFile()
    if (!path) return
    const patch: Partial<FeatureConfig> = { filePath: path }
    if (!feature.title.trim()) {
      patch.title = fileNameOf(path)
        .replace(/\.[^.]+$/, '')
        .replace(/[._]+/g, ' ')
        .trim()
    }
    updateFeature(patch)
  }

  async function pickSubtitles(): Promise<void> {
    const path = await window.api.pickSubtitleFile()
    if (path) updateFeature({ subtitlePath: path })
  }

  return (
    <>
      <div className="field">
        <span className="field-label">Movie file</span>
        <div className="picker-row">
          <div className="feature-path" title={feature.filePath}>
            {feature.filePath ? fileNameOf(feature.filePath) : 'No file chosen'}
          </div>
          <button className="btn" onClick={pickMovie}>
            {feature.filePath ? 'Change…' : 'Choose…'}
          </button>
        </div>
        {feature.filePath && exists === false && (
          <p className="feature-warning">
            ⚠ Can&apos;t find this file. Was it moved, or is its drive unplugged?
          </p>
        )}
        <p className="inspector-hint">
          The movie stays where it is: it&apos;s linked, not copied into the project.
        </p>
      </div>

      {resumeAt !== null && (
        <div className="feature-resume">
          <span>
            The last showing stopped at <strong>{formatTimecode(resumeAt)}</strong>.
          </span>
          <button className="btn btn-primary" onClick={() => onResumeMovie(resumeAt)}>
            ⏯ Resume the movie
          </button>
        </div>
      )}

      <span className="field-label-plain">Play it in</span>
      <Toggle<MoviePlayer>
        value={feature.player}
        options={[
          { value: 'builtin', label: 'This app' },
          { value: 'external', label: 'My video player' }
        ]}
        onChange={(player) => updateFeature({ player })}
      />
      <p className="inspector-hint">
        {feature.player === 'builtin'
          ? "Seamless: fades straight from the pre-show, and can resume after a crash. Plays most .mp4 files; if a file won't play (some .mkv, .avi), it opens in your video player instead."
          : 'At showtime the app steps aside and opens the file in your default player (VLC, Movies & TV…), which plays nearly any format. Use its own controls during the movie.'}
      </p>

      {feature.player === 'builtin' && (
        <div className="field">
          <span className="field-label">Subtitles (optional)</span>
          <div className="picker-row">
            <div className="feature-path" title={feature.subtitlePath}>
              {feature.subtitlePath ? fileNameOf(feature.subtitlePath) : 'None'}
            </div>
            {feature.subtitlePath && (
              <button
                className="btn btn-ghost btn-danger"
                onClick={() => updateFeature({ subtitlePath: '' })}
              >
                Remove
              </button>
            )}
            <button className="btn" onClick={pickSubtitles}>
              {feature.subtitlePath ? 'Change…' : '.srt / .vtt…'}
            </button>
          </div>
          <p className="inspector-hint">
            Turn them on or off during the movie with C or the remote.
          </p>
        </div>
      )}
    </>
  )
}

export default function FeatureInspector({
  onResumeMovie
}: {
  onResumeMovie: (atSec: number) => void
}): React.JSX.Element {
  const { project, updateFeature } = useProject()
  const feature = project!.feature
  const countdown = project!.countdown
  const streamUrlOk = !feature.streamUrl || /^https:\/\//i.test(feature.streamUrl.trim())

  return (
    <div className="feature-inspector">
      <section className="feature-section">
        <span className="section-label">Tonight&apos;s movie</span>
        <label className="field">
          <span className="field-label">Title</span>
          <input
            type="text"
            placeholder="e.g. The Goonies"
            value={feature.title}
            onChange={(e) => updateFeature({ title: e.target.value })}
          />
        </label>
        <LibraryPicker
          kind="image"
          label="Poster (optional)"
          value={feature.posterImage}
          onChange={(posterImage) => updateFeature({ posterImage })}
        />
        <span className="field-label-plain">How it plays</span>
        <Toggle<MovieSource>
          value={feature.source}
          options={[
            { value: 'none', label: 'No movie' },
            { value: 'file', label: '🎞️ File on this PC' },
            { value: 'stream', label: '🌐 Streaming link' }
          ]}
          onChange={(source) => updateFeature({ source })}
        />
        {feature.source === 'none' && (
          <p className="inspector-hint">
            Pre-show only: the show ends when the playlist does, like before.
          </p>
        )}
        {feature.source === 'file' && (
          <MovieFileSettings feature={feature} onResumeMovie={onResumeMovie} />
        )}
        {feature.source === 'stream' && (
          <>
            <label className="field">
              <span className="field-label">Link to the movie</span>
              <input
                type="url"
                placeholder="https://www.netflix.com/watch/…"
                value={feature.streamUrl}
                onChange={(e) => updateFeature({ streamUrl: e.target.value })}
              />
            </label>
            {!streamUrlOk && <p className="feature-warning">⚠ The link must start with https://</p>}
            <p className="inspector-hint">
              Open the movie on Netflix, Disney+ or another service in your browser and copy the
              address. At showtime it opens in your default browser (sign in beforehand) and the app
              steps aside. Press F11 or the player&apos;s full-screen button, and use the
              service&apos;s own controls; the phone remote can&apos;t pause streaming.
            </p>
          </>
        )}
      </section>

      <section className="feature-section">
        <span className="section-label">At showtime</span>
        <p className="inspector-hint">
          When the countdown reaches zero, whatever is playing finishes, then the{' '}
          <strong>hold screen</strong> comes up. Press <kbd>Enter</kbd> (or 🎬 Wrap up on the phone
          remote) to wrap up early.
        </p>
        {!countdown.enabled && (
          <p className="feature-warning">
            The countdown overlay is off, so showtime never arrives on its own: wrap up with Enter
            or the remote, or the hold screen comes up when the playlist ends.
          </p>
        )}
        <Toggle<MovieStartMode>
          value={feature.startMode}
          options={[
            { value: 'auto', label: 'Start the movie automatically' },
            { value: 'manual', label: 'Wait for the go button' }
          ]}
          onChange={(startMode) => updateFeature({ startMode })}
        />
        {feature.startMode === 'auto' ? (
          <label className="field">
            <span className="field-label">
              Hold screen stays up for <span>{formatTimecode(feature.holdSec)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={180}
              step={5}
              value={feature.holdSec}
              onChange={(e) => updateFeature({ holdSec: Number(e.target.value) })}
            />
          </label>
        ) : (
          <p className="inspector-hint">
            The hold screen stays up until you press <kbd>Enter</kbd> or ▶ Start the movie on the
            phone remote.
          </p>
        )}
      </section>

      <section className="feature-section">
        <span className="section-label">Hold screen</span>
        <label className="field">
          <span className="field-label">Message</span>
          <input
            type="text"
            value={feature.holdMessage}
            onChange={(e) => updateFeature({ holdMessage: e.target.value })}
          />
        </label>
        <LibraryPicker
          kind="audio"
          label="Music (loops quietly)"
          value={feature.holdMusic}
          onChange={(holdMusic) => updateFeature({ holdMusic })}
        />
        {feature.holdMusic && (
          <label className="field">
            <span className="field-label">
              Music volume <span>{Math.round(feature.holdMusicVolume * 100)}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={feature.holdMusicVolume}
              onChange={(e) => updateFeature({ holdMusicVolume: Number(e.target.value) })}
            />
          </label>
        )}
        <GroupPicker
          label="Slides rotating behind it"
          value={feature.holdSlideGroupId}
          onChange={(holdSlideGroupId) => updateFeature({ holdSlideGroupId })}
        />
      </section>

      <section className="feature-section">
        <span className="section-label">Into the movie</span>
        <label className="field">
          <span className="field-label">Transition</span>
          <select
            value={feature.transition}
            onChange={(e) => updateFeature({ transition: e.target.value as MovieTransition })}
          >
            <option value="bumper">&quot;Our Feature Presentation&quot; curtain card</option>
            <option value="fade">Fade to black</option>
            <option value="clip">Play my own intro clip</option>
          </select>
        </label>
        {feature.transition === 'clip' && (
          <LibraryPicker
            kind="video"
            label="Intro clip"
            value={feature.introClip}
            onChange={(introClip) => updateFeature({ introClip })}
            noneLabel="Choose a clip…"
          />
        )}
      </section>

      <section className="feature-section">
        <span className="section-label">After the movie</span>
        <label className="field">
          <span className="field-label">Message</span>
          <input
            type="text"
            value={feature.endMessage}
            onChange={(e) => updateFeature({ endMessage: e.target.value })}
          />
        </label>
        <GroupPicker
          label="Slides rotating behind it"
          value={feature.endSlideGroupId}
          onChange={(endSlideGroupId) => updateFeature({ endSlideGroupId })}
        />
        <p className="inspector-hint">
          Shown when a built-in movie ends. For a movie in your player or browser, bring it up with{' '}
          <kbd>Enter</kbd> or the phone remote.
        </p>
      </section>

      <section className="feature-section">
        <span className="section-label">During the show</span>
        <ul className="feature-keys">
          <li>
            <kbd>Enter</kbd> wrap up (twice: start the movie now) · on the hold screen, start it
          </li>
          <li>
            <kbd>Space</kbd> pause · <kbd>↑</kbd>/<kbd>↓</kbd> volume · <kbd>←</kbd>/<kbd>→</kbd>{' '}
            skip (in the movie: 10 s)
          </li>
          <li>
            <kbd>C</kbd> subtitles · <kbd>Esc</kbd> exit (twice during the movie)
          </li>
        </ul>
      </section>
    </div>
  )
}
