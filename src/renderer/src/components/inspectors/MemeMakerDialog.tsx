import { useEffect, useMemo, useRef, useState } from 'react'
import type { SlideshowItem } from '@shared/types'
import {
  BUILTIN_MEME_CAPTIONS,
  buildMemeCaptionPrompt,
  buildMemeImagePrompt,
  parseMemeCaptions,
  type MemeCaption
} from '@shared/memes'
import { aiReady, findProvider } from '@shared/ai'
import { useProject } from '../../state/useProject'
import { useAiConfig } from '../../lib/aiConfig'
import { userMessage } from '../../lib/errors'
import { drawMeme, loadImage, renderPictureLayer } from '../../lib/memeRender'
import Modal from '../Modal'
import AiSettingsDialog from '../AiSettingsDialog'

interface Picture {
  src: string
  label: string
}

/** Make a classic top/bottom-caption meme and add it to the group as an image slide. The
 * picture comes from the library, a new import, or the connected AI; the captions are
 * typed, picked from ideas, or suggested by the AI. */
export default function MemeMakerDialog({
  item,
  onClose,
  onCreated
}: {
  item: SlideshowItem
  onClose: () => void
  onCreated: (frameId: string) => void
}): React.JSX.Element {
  const { project, dir, importToLibrary, addImageSlide } = useProject()
  const aiConfig = useAiConfig()
  const ai = aiReady(aiConfig)
  const providerLabel = aiConfig?.active ? findProvider(aiConfig.active).label : ''
  const images = project!.library.images

  const [picture, setPicture] = useState<Picture | null>(null)
  /** The last picture that finished loading, tagged with its source. */
  const [loaded, setLoaded] = useState<{ src: string; img: HTMLImageElement } | null>(null)
  const [caption, setCaption] = useState<MemeCaption>(BUILTIN_MEME_CAPTIONS[0])
  const [ideas, setIdeas] = useState<MemeCaption[]>(BUILTIN_MEME_CAPTIONS)
  const [ideasFromAi, setIdeasFromAi] = useState(false)
  const [pictureIdea, setPictureIdea] = useState('')
  const [busy, setBusy] = useState<'image' | 'captions' | 'save' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAiSettings, setShowAiSettings] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const topics = item.frames
    .filter((f) => f.content === 'text' && f.title.trim())
    .map((f) => f.title.trim())
    .slice(0, 8)
    .join(', ')

  useEffect(() => {
    let cancelled = false
    if (!picture) return
    loadImage(picture.src)
      .then((img) => !cancelled && setLoaded({ src: picture.src, img }))
      .catch((err) => {
        if (cancelled) return
        setError(userMessage(err))
        setPicture(null)
      })
    return () => {
      cancelled = true
    }
  }, [picture])

  // Only the picture that is actually selected: never a previous one while the new one is
  // loading (or failed to).
  const shownImg = picture && loaded?.src === picture.src ? loaded.img : null
  const pictureLoading = !!picture && !shownImg
  // The blurred picture layer is costly, so it's built once per picture, not per keystroke.
  const layer = useMemo(() => renderPictureLayer(shownImg), [shownImg])
  useEffect(() => {
    if (canvasRef.current) drawMeme(canvasRef.current, layer, caption)
  }, [layer, caption])

  async function pickLibraryImage(fileName: string): Promise<void> {
    setError(null)
    try {
      const src = await window.api.readImageDataUrl(dir!, fileName)
      const f = images.find((x) => x.fileName === fileName)
      setPicture({ src, label: f?.displayName ?? fileName })
    } catch (err) {
      setError(userMessage(err))
    }
  }

  async function importPicture(): Promise<void> {
    const files = await importToLibrary('image')
    if (files[0]) await pickLibraryImage(files[0].fileName)
  }

  async function drawWithAi(): Promise<void> {
    setBusy('image')
    setError(null)
    try {
      const idea = pictureIdea.trim() || `something funny about ${topics || 'movie night snacks'}`
      const result = await window.api.aiImage(buildMemeImagePrompt(idea))
      setPicture({
        src: `data:${result.mimeType};base64,${result.base64}`,
        label: `AI picture: ${idea}`
      })
    } catch (err) {
      setError(userMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function suggestCaptions(): Promise<void> {
    setBusy('captions')
    setError(null)
    try {
      const reply = await window.api.aiText(
        buildMemeCaptionPrompt({
          context: [topics, pictureIdea].filter(Boolean).join('; '),
          event: project!.aiPrompt.event,
          tone: project!.aiPrompt.tone,
          count: 8
        })
      )
      const parsed = parseMemeCaptions(reply)
      if (parsed.length === 0)
        throw new Error("The AI's reply didn't contain any captions. Try again.")
      setIdeas(parsed)
      setIdeasFromAi(true)
      setCaption(parsed[0])
    } catch (err) {
      setError(userMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function save(): Promise<void> {
    if (!canvasRef.current) return
    setBusy('save')
    setError(null)
    try {
      drawMeme(canvasRef.current, layer, caption)
      const base64 = canvasRef.current.toDataURL('image/png').split(',')[1]
      const name = `meme ${caption.top || caption.bottom}`.slice(0, 36)
      const file = await window.api.saveImageData(dir!, name, 'image/png', base64)
      const label = `Meme: ${[caption.top, caption.bottom].filter(Boolean).join(' / ')}`
      onCreated(addImageSlide(item.id, file, label))
      onClose()
    } catch (err) {
      setError(userMessage(err))
      setBusy(null)
    }
  }

  return (
    <Modal title="😂 Make a meme slide" onClose={onClose} width={900}>
      <div className="meme-layout">
        <div className="meme-controls">
          <section className="ai-step">
            <h3>
              <span className="ai-step-num">1</span> Picture
            </h3>
            <div className="picker-row">
              <button className="btn" onClick={importPicture}>
                + Import
              </button>
              {images.length > 0 && (
                <select
                  value=""
                  aria-label="Picture from your media library"
                  onChange={(e) => e.target.value && pickLibraryImage(e.target.value)}
                >
                  <option value="">From your library…</option>
                  {images.map((f) => (
                    <option key={f.fileName} value={f.fileName}>
                      {f.displayName}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {ai.images ? (
              <div className="meme-ai-picture">
                <textarea
                  rows={2}
                  value={pictureIdea}
                  placeholder={`Describe a picture for ${providerLabel} to draw, e.g. "a popcorn bucket nervously checking its phone"`}
                  onChange={(e) => setPictureIdea(e.target.value)}
                />
                <button className="btn" disabled={busy !== null} onClick={drawWithAi}>
                  {busy === 'image'
                    ? '🎨 Drawing… (up to a minute)'
                    : `🎨 Draw it with ${providerLabel}`}
                </button>
              </div>
            ) : (
              <p className="inspector-hint">
                {ai.text
                  ? `${providerLabel} can't draw pictures; use one from your library, or pick a picture-capable AI in ✨ AI settings.`
                  : 'Tip: connect an AI that draws (OpenAI, Gemini) to make a picture from a description.'}
              </p>
            )}
            {picture && <p className="inspector-hint meme-picture-label">🖼 {picture.label}</p>}
          </section>

          <section className="ai-step">
            <h3>
              <span className="ai-step-num">2</span> Captions
            </h3>
            <label className="field">
              <span className="field-label">Top text</span>
              <input
                type="text"
                value={caption.top}
                onChange={(e) => setCaption({ ...caption, top: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">Bottom text</span>
              <input
                type="text"
                value={caption.bottom}
                onChange={(e) => setCaption({ ...caption, bottom: e.target.value })}
              />
            </label>
            <div className="meme-ideas-header">
              <span className="field-label-plain">
                {ideasFromAi ? `Ideas from ${providerLabel}` : 'Ideas'}: click one to use it
              </span>
              {ai.text ? (
                <button
                  className="btn btn-ghost"
                  disabled={busy !== null}
                  onClick={suggestCaptions}
                >
                  {busy === 'captions' ? '✨ Thinking…' : '✨ Suggest captions'}
                </button>
              ) : (
                <button className="btn-link" onClick={() => setShowAiSettings(true)}>
                  Connect an AI for fresh ideas
                </button>
              )}
            </div>
            <ul className="meme-ideas">
              {ideas.map((idea, i) => (
                <li key={`${idea.top}|${idea.bottom}|${i}`}>
                  <button
                    className={`meme-idea ${idea.top === caption.top && idea.bottom === caption.bottom ? 'meme-idea-active' : ''}`}
                    onClick={() => setCaption(idea)}
                  >
                    <span>{idea.top}</span>
                    <span>{idea.bottom}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="meme-preview">
          <span className="field-label-plain">Preview (full screen, 1920×1080)</span>
          <canvas ref={canvasRef} className="meme-canvas" />
          {!picture && (
            <p className="inspector-hint">
              Pick or draw a picture; the captions work on their own too.
            </p>
          )}
        </div>
      </div>

      {error && <p className="feature-warning">{error}</p>}
      {showAiSettings && <AiSettingsDialog onClose={() => setShowAiSettings(false)} />}
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          disabled={
            busy !== null ||
            pictureLoading ||
            (!caption.top.trim() && !caption.bottom.trim() && !picture)
          }
          onClick={save}
        >
          {busy === 'save' ? 'Adding…' : 'Add meme slide'}
        </button>
      </div>
    </Modal>
  )
}
