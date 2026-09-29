import { useEffect, useMemo, useRef, useState } from 'react'
import type { SlideFrame, SlideshowItem } from '@shared/types'
import { SUBTITLE_MAX_CHARS } from '@shared/types'
import {
  normalizeTitleKey,
  parseAiReply,
  planSubtitleImport,
  type PlanEntry
} from '@shared/aiPrompt'
import { useProject } from '../../state/useProject'
import { frameLabel } from '../../lib/itemMeta'
import Modal from '../Modal'
import { promptableFrames, usePromptCopier, useSubtitlePrompt } from '../../hooks/usePromptCopier'
import { aiReady, findProvider } from '@shared/ai'
import { useAiConfig } from '../../lib/aiConfig'
import { userMessage } from '../../lib/errors'
import AiSettingsDialog from '../AiSettingsDialog'

function splitTitles(text: string): string[] {
  const seen = new Set<string>()
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => {
      const k = normalizeTitleKey(l)
      if (!k || seen.has(k)) return false
      seen.add(k)
      return true
    })
}

export default function AiSubtitlesDialog({
  item,
  frame,
  onClose,
  onApplied,
  autoGenerate = false
}: {
  item: SlideshowItem
  /** When set, the dialog works on this one slide: every pasted line goes to it. */
  frame?: SlideFrame
  onClose: () => void
  onApplied: (createdIds: string[]) => void
  /** Ask the connected AI straight away (the slide's "✨ Write more" button). */
  autoGenerate?: boolean
}): React.JSX.Element {
  const { project, updateAiPrompt, applySubtitlePlan } = useProject()
  const settings = project!.aiPrompt
  const copyPrompt = usePromptCopier()
  const buildPrompt = useSubtitlePrompt()
  const aiConfig = useAiConfig()
  const ai = aiReady(aiConfig)
  const providerLabel = aiConfig?.active ? findProvider(aiConfig.active).label : ''
  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [showAiSettings, setShowAiSettings] = useState(false)
  const [titlesText, setTitlesText] = useState('')
  const [reply, setReply] = useState('')
  const [copied, setCopied] = useState(false)
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const textFrames = item.frames.filter((f) => f.content === 'text')
  const [untitledTarget, setUntitledTarget] = useState(frame?.id ?? textFrames[0]?.id ?? '')

  const typedTitles = splitTitles(titlesText)
  const promptFrames = frame ? [frame] : promptableFrames(item)
  const newTypedTitles = typedTitles.filter(
    (t) => !item.frames.some((f) => normalizeTitleKey(f.title) === normalizeTitleKey(t))
  )
  const promptCount = promptFrames.length + (frame ? 0 : newTypedTitles.length)

  const plan: PlanEntry[] = useMemo(() => {
    let sections = parseAiReply(reply)
    // One-slide mode: whatever titles the reply uses, all of it is for this slide.
    if (frame) sections = [{ title: null, lines: sections.flatMap((s) => s.lines) }]
    const targets = item.frames
      .filter((f) => f.content === 'text')
      .map((f) => ({ id: f.id, title: f.title, existing: f.subtitleOptions }))
    return planSubtitleImport(
      sections,
      targets,
      frame ? frame.id : untitledTarget,
      frame ? [] : newTypedTitles
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reply, frame, item.frames, untitledTarget, titlesText])

  const hasUntitled = !frame && parseAiReply(reply).some((s) => s.title === null)
  const lineKey = (e: PlanEntry, line: string): string =>
    `${e.frameId ?? 'new:' + e.title}\n${line}`
  const finalPlan = plan
    .map((e) => ({ ...e, lines: e.lines.filter((l) => !removed.has(lineKey(e, l))) }))
    .filter((e) => e.lines.length > 0 || !e.frameId)
  const lineTotal = finalPlan.reduce((n, e) => n + e.lines.length, 0)
  const newSlides = finalPlan.filter((e) => !e.frameId).length

  function handleCopy(): void {
    copyPrompt(item, frame, frame ? [] : newTypedTitles)
    setCopied(true)
    setTimeout(() => setCopied(false), 4000)
  }

  async function handleGenerate(): Promise<void> {
    setGenerating(true)
    setAiError(null)
    try {
      const text = await window.api.aiText(buildPrompt(item, frame, frame ? [] : newTypedTitles))
      setReply(text)
      setRemoved(new Set())
    } catch (err) {
      setAiError(userMessage(err))
    } finally {
      setGenerating(false)
    }
  }

  const autoRan = useRef(false)
  useEffect(() => {
    if (!autoGenerate || autoRan.current || !ai.text || promptCount === 0) return
    autoRan.current = true
    handleGenerate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, ai.text])

  function addTypedSlides(): void {
    const created = applySubtitlePlan(
      item.id,
      newTypedTitles.map((title) => ({ title, lines: [] }))
    )
    setTitlesText('')
    onApplied(created)
  }

  function applyReply(): void {
    const created = applySubtitlePlan(
      item.id,
      finalPlan.map((e) => ({ frameId: e.frameId, title: e.title, lines: e.lines }))
    )
    onApplied(created)
    onClose()
  }

  return (
    <Modal
      title={frame ? `AI subtitles for “${frameLabel(frame)}”` : 'Quick build & AI subtitles'}
      onClose={onClose}
    >
      {!frame && (
        <section className="ai-step">
          <h3>
            <span className="ai-step-num">1</span> Add slides from a list of titles
            <span className="ai-step-optional">optional</span>
          </h3>
          <textarea
            rows={4}
            value={titlesText}
            placeholder={
              'One title per line, e.g.\nSilence Your Phones\nSnacks Are Ready\nNo Spoilers'
            }
            onChange={(e) => setTitlesText(e.target.value)}
          />
          <div className="ai-row">
            <button className="btn" disabled={newTypedTitles.length === 0} onClick={addTypedSlides}>
              Add {newTypedTitles.length || ''} slide{newTypedTitles.length === 1 ? '' : 's'}
            </button>
            <span className="inspector-hint ai-inline-hint">
              New slides use this group&apos;s current look. Titles you type here are also included
              in the AI prompt below.
            </span>
          </div>
        </section>
      )}

      <section className="ai-step">
        <h3>
          <span className="ai-step-num">{frame ? 1 : 2}</span> Copy a prompt for your favorite AI
          chat
        </h3>
        <div className="ai-settings">
          <label className="field">
            <span className="field-label">Event (optional)</span>
            <input
              type="text"
              value={settings.event}
              placeholder="e.g. Halloween movie night — tonight's movie: Hocus Pocus"
              onChange={(e) => updateAiPrompt({ event: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">Tone</span>
            <input
              type="text"
              value={settings.tone}
              onChange={(e) => updateAiPrompt({ tone: e.target.value })}
            />
          </label>
          <label className="field ai-count">
            <span className="field-label">Per title</span>
            <input
              type="number"
              min={1}
              max={20}
              value={settings.perTitle}
              onChange={(e) =>
                updateAiPrompt({
                  perTitle: Math.min(20, Math.max(1, Math.round(Number(e.target.value) || 1)))
                })
              }
            />
          </label>
        </div>
        <div className="ai-row">
          <button className="btn btn-primary" disabled={promptCount === 0} onClick={handleCopy}>
            📋 Copy prompt{frame ? '' : ` for ${promptCount} slide${promptCount === 1 ? '' : 's'}`}
          </button>
          <span className={`inspector-hint ai-inline-hint ${copied ? 'ai-copied' : ''}`}>
            {copied
              ? 'Copied! Paste it into ChatGPT, Claude, Gemini or Copilot, then copy its reply.'
              : promptCount === 0
                ? 'Add a slide with a title first.'
                : 'Works with any AI chat. No account or API key needed in this app.'}
          </span>
        </div>
        <div className="ai-row ai-direct-row">
          {ai.text ? (
            <>
              <button
                className="btn btn-primary"
                disabled={promptCount === 0 || generating}
                onClick={handleGenerate}
              >
                {generating ? `✨ Asking ${providerLabel}…` : `✨ Write them with ${providerLabel}`}
              </button>
              <span className="inspector-hint ai-inline-hint">
                Or skip the copy and paste: the reply appears below for you to review.
              </span>
            </>
          ) : (
            <span className="inspector-hint ai-inline-hint">
              Want it in one click?{' '}
              <button className="btn-link" onClick={() => setShowAiSettings(true)}>
                Connect your own AI
              </button>{' '}
              (Claude, ChatGPT, Gemini or a local model).
            </span>
          )}
        </div>
        {aiError && <p className="feature-warning">{aiError}</p>}
      </section>

      <section className="ai-step">
        <h3>
          <span className="ai-step-num">{frame ? 2 : 3}</span> {ai.text ? 'Review' : 'Paste'} the
          AI&apos;s reply
        </h3>
        <textarea
          rows={6}
          value={reply}
          placeholder="Paste the whole reply here — extra chatter, bullets and numbering are cleaned up automatically. A plain list of lines works too."
          onChange={(e) => {
            setReply(e.target.value)
            setRemoved(new Set())
          }}
        />

        {hasUntitled && textFrames.length > 0 && (
          <label className="field ai-untitled">
            <span className="field-label">Lines without a TITLE: go to</span>
            <select value={untitledTarget} onChange={(e) => setUntitledTarget(e.target.value)}>
              {textFrames.map((f) => (
                <option key={f.id} value={f.id}>
                  {frameLabel(f)}
                </option>
              ))}
            </select>
          </label>
        )}

        {reply.trim() && (
          <div className="ai-review">
            {plan.length === 0 && (
              <p className="inspector-hint">No subtitle lines found in that text yet.</p>
            )}
            {plan.map((entry) => (
              <div className="ai-review-entry" key={entry.frameId ?? `new:${entry.title}`}>
                <div className="ai-review-title">
                  {entry.title || 'Untitled'}
                  {!entry.frameId && <span className="ai-badge">new slide</span>}
                  {entry.duplicates > 0 && (
                    <span className="ai-dupes">{entry.duplicates} already there, skipped</span>
                  )}
                </div>
                <ul>
                  {entry.lines.map((line) => {
                    const k = lineKey(entry, line)
                    const off = removed.has(k)
                    return (
                      <li key={line} className={off ? 'ai-line-removed' : ''}>
                        <span className="ai-line-text">{line}</span>
                        {line.length > SUBTITLE_MAX_CHARS && (
                          <span className="ai-line-long">{line.length} chars</span>
                        )}
                        <button
                          className="btn btn-ghost icon-btn"
                          title={off ? 'Keep this line' : 'Leave this line out'}
                          onClick={() =>
                            setRemoved((prev) => {
                              const next = new Set(prev)
                              if (off) next.delete(k)
                              else next.add(k)
                              return next
                            })
                          }
                        >
                          {off ? '↺' : '✕'}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {showAiSettings && <AiSettingsDialog onClose={() => setShowAiSettings(false)} />}
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          disabled={lineTotal === 0 && newSlides === 0}
          onClick={applyReply}
        >
          Add {lineTotal} subtitle{lineTotal === 1 ? '' : 's'}
          {frame
            ? ''
            : ` to ${finalPlan.length} slide${finalPlan.length === 1 ? '' : 's'}${newSlides ? ` (${newSlides} new)` : ''}`}
        </button>
      </div>
    </Modal>
  )
}
