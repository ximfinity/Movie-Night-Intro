import { useMemo, useState } from 'react'
import type { TriviaItem, TriviaQuestion } from '@shared/types'
import { TRIVIA_LETTERS, buildTriviaPrompt, parseTriviaReply } from '@shared/trivia'
import { aiReady, findProvider } from '@shared/ai'
import { useProject } from '../../state/useProject'
import { useAiConfig } from '../../lib/aiConfig'
import { userMessage } from '../../lib/errors'
import Modal from '../Modal'
import AiSettingsDialog from '../AiSettingsDialog'

const isBlank = (q: TriviaQuestion): boolean =>
  !q.question.trim() && q.choices.every((c) => !c.trim()) && !q.note.trim()

/** Write trivia questions with an AI: one click with a connected AI, or copy a prompt into
 * any AI chat and paste its reply back. Questions are reviewed before they're added. */
export default function TriviaAiDialog({
  item,
  onClose,
  onAdded
}: {
  item: TriviaItem
  onClose: () => void
  onAdded: (firstNewId: string | null) => void
}): React.JSX.Element {
  const { project, updateItem } = useProject()
  const aiConfig = useAiConfig()
  const ai = aiReady(aiConfig)
  const providerLabel = aiConfig?.active ? findProvider(aiConfig.active).label : ''
  const [movie, setMovie] = useState(project!.feature.title)
  const [count, setCount] = useState(6)
  const [reply, setReply] = useState('')
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [showAiSettings, setShowAiSettings] = useState(false)
  const [skipped, setSkipped] = useState<Set<number>>(new Set())

  const prompt = (): string =>
    buildTriviaPrompt({
      movie,
      event: project!.aiPrompt.event,
      count,
      existing: item.questions.map((q) => q.question)
    })
  const parsed = useMemo(() => parseTriviaReply(reply), [reply])
  const keep = parsed.filter((_, i) => !skipped.has(i))

  async function handleGenerate(): Promise<void> {
    setGenerating(true)
    setAiError(null)
    try {
      setReply(await window.api.aiText(prompt()))
      setSkipped(new Set())
    } catch (err) {
      setAiError(userMessage(err))
    } finally {
      setGenerating(false)
    }
  }

  function handleCopy(): void {
    window.api.copyText(prompt())
    setCopied(true)
    setTimeout(() => setCopied(false), 4000)
  }

  function add(): void {
    // The empty question a new round starts with is replaced, not kept.
    const existing = item.questions.filter((q) => !isBlank(q))
    updateItem(item.id, { questions: [...existing, ...keep] } as Partial<TriviaItem>)
    onAdded(keep[0]?.id ?? null)
    onClose()
  }

  return (
    <Modal title="Write trivia questions with AI" onClose={onClose}>
      <section className="ai-step">
        <h3>
          <span className="ai-step-num">1</span> What should the questions be about?
        </h3>
        <div className="ai-settings">
          <label className="field">
            <span className="field-label">Movie (optional)</span>
            <input
              type="text"
              value={movie}
              placeholder="e.g. Moana. Leave blank for family movies in general"
              onChange={(e) => setMovie(e.target.value)}
            />
          </label>
          <label className="field ai-count">
            <span className="field-label">Questions</span>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) =>
                setCount(Math.min(20, Math.max(1, Math.round(Number(e.target.value) || 1))))
              }
            />
          </label>
        </div>
        <div className="ai-row ai-direct-row">
          {ai.text ? (
            <button className="btn btn-primary" disabled={generating} onClick={handleGenerate}>
              {generating ? `✨ Asking ${providerLabel}…` : `✨ Write them with ${providerLabel}`}
            </button>
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
        <div className="ai-row">
          <button className={ai.text ? 'btn' : 'btn btn-primary'} onClick={handleCopy}>
            📋 Copy prompt
          </button>
          <span className={`inspector-hint ai-inline-hint ${copied ? 'ai-copied' : ''}`}>
            {copied
              ? 'Copied! Paste it into ChatGPT, Claude, Gemini or Copilot, then copy its reply.'
              : 'Or use any AI chat: copy the prompt, then paste the reply below.'}
          </span>
        </div>
        {aiError && <p className="feature-warning">{aiError}</p>}
      </section>

      <section className="ai-step">
        <h3>
          <span className="ai-step-num">2</span> {ai.text ? 'Review' : 'Paste'} the questions
        </h3>
        <textarea
          rows={6}
          value={reply}
          placeholder={
            'Paste the whole reply here, e.g.\nQ: …\nA) …\nB) …\nC) …\nD) …\nANSWER: B\nFACT: …'
          }
          onChange={(e) => {
            setReply(e.target.value)
            setSkipped(new Set())
          }}
        />
        {reply.trim() && parsed.length === 0 && (
          <p className="inspector-hint">
            No complete questions found yet (each needs choices and an ANSWER line).
          </p>
        )}
        {parsed.length > 0 && (
          <ol className="trivia-review">
            {parsed.map((q, i) => {
              const off = skipped.has(i)
              return (
                <li key={q.id} className={off ? 'ai-line-removed' : ''}>
                  <div className="trivia-review-q">
                    <span>{q.question}</span>
                    <button
                      className="btn btn-ghost icon-btn"
                      title={off ? 'Keep this question' : 'Leave this question out'}
                      onClick={() =>
                        setSkipped((prev) => {
                          const next = new Set(prev)
                          if (off) next.delete(i)
                          else next.add(i)
                          return next
                        })
                      }
                    >
                      {off ? '↺' : '✕'}
                    </button>
                  </div>
                  <div className="trivia-review-choices">
                    {q.choices
                      .map((c, ci) => ({ c, ci }))
                      .filter(({ c }) => c.trim())
                      .map(({ c, ci }) => (
                        <span key={ci} className={ci === q.answer ? 'trivia-review-right' : ''}>
                          {TRIVIA_LETTERS[ci]}) {c}
                        </span>
                      ))}
                  </div>
                  {q.note && <div className="trivia-review-note">💡 {q.note}</div>}
                </li>
              )
            })}
          </ol>
        )}
        <p className="inspector-hint">
          AI can get facts wrong. Give each answer a quick check before the show.
        </p>
      </section>

      {showAiSettings && <AiSettingsDialog onClose={() => setShowAiSettings(false)} />}
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={keep.length === 0} onClick={add}>
          Add {keep.length} question{keep.length === 1 ? '' : 's'}
        </button>
      </div>
    </Modal>
  )
}
