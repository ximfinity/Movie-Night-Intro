import { useState } from 'react'
import type { TriviaItem, TriviaQuestion } from '@shared/types'
import {
  CHOICE_MAX_CHARS,
  MAX_CHOICES,
  NOTE_MAX_CHARS,
  QUESTION_MAX_CHARS,
  TRIVIA_LETTERS,
  createTriviaQuestion,
  isPlayableQuestion
} from '@shared/trivia'
import { RANDOM_THEME, SLIDE_THEMES, findSlideTheme } from '@shared/slideThemes'
import { useProject } from '../../state/useProject'
import TransitionSelect from './TransitionSelect'
import ThemeSwatches from './ThemeSwatches'
import TriviaAiDialog from './TriviaAiDialog'
import TriviaSlide from '../../screens/ShowPlayer/TriviaSlide'

export default function TriviaInspector({ item }: { item: TriviaItem }): React.JSX.Element {
  const { updateItem } = useProject()
  const [selectedId, setSelectedId] = useState(item.questions[0]?.id ?? '')
  const [aiOpen, setAiOpen] = useState(false)
  const selectedIndex = Math.max(
    0,
    item.questions.findIndex((q) => q.id === selectedId)
  )
  const selected = item.questions[selectedIndex]
  const playable = item.questions.filter(isPlayableQuestion).length

  function setQuestions(questions: TriviaQuestion[]): void {
    updateItem(item.id, { questions } as Partial<TriviaItem>)
  }
  function patchQuestion(id: string, patch: Partial<TriviaQuestion>): void {
    setQuestions(item.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }
  function addQuestion(): void {
    const q = createTriviaQuestion()
    setQuestions([...item.questions, q])
    setSelectedId(q.id)
  }
  function removeQuestion(id: string): void {
    const rest = item.questions.filter((q) => q.id !== id)
    setQuestions(rest.length > 0 ? rest : [createTriviaQuestion()])
  }
  function move(index: number, by: number): void {
    const to = index + by
    if (to < 0 || to >= item.questions.length) return
    const next = [...item.questions]
    const [q] = next.splice(index, 1)
    next.splice(to, 0, q)
    setQuestions(next)
  }

  return (
    <div className="slideshow-inspector">
      <div className="slideshow-settings">
        <label className="field">
          <span className="field-label">Round name</span>
          <input
            type="text"
            aria-label="Round name"
            value={item.name}
            placeholder="Movie Trivia"
            onChange={(e) => updateItem(item.id, { name: e.target.value })}
          />
        </label>

        <TransitionSelect
          value={item.transition}
          onChange={(transition) => updateItem(item.id, { transition })}
        />
        <ThemeSwatches
          value={item.theme}
          onChange={(theme) => updateItem(item.id, { theme } as Partial<TriviaItem>)}
        />

        <div className="trivia-timing">
          <label className="field">
            <span className="field-label">
              Question on screen <span>{item.questionSec}s</span>
            </span>
            <input
              type="range"
              aria-label="Seconds per question"
              min={5}
              max={60}
              step={1}
              value={item.questionSec}
              onChange={(e) =>
                updateItem(item.id, { questionSec: Number(e.target.value) } as Partial<TriviaItem>)
              }
            />
          </label>
          <label className="field">
            <span className="field-label">
              Answer on screen <span>{item.answerSec}s</span>
            </span>
            <input
              type="range"
              aria-label="Seconds per answer"
              min={3}
              max={30}
              step={1}
              value={item.answerSec}
              onChange={(e) =>
                updateItem(item.id, { answerSec: Number(e.target.value) } as Partial<TriviaItem>)
              }
            />
          </label>
        </div>
        <p className="inspector-hint">
          Each question shows its choices with a countdown bar, then a second slide reveals the
          answer and its fun fact.
        </p>

        <TriviaMusic item={item} />

        <div className="frames-header">
          <span className="section-label">
            Questions ({playable}
            {playable !== item.questions.length ? ` of ${item.questions.length} ready` : ''})
          </span>
          <div className="frames-header-actions">
            <button
              className="btn btn-ghost quick-build-btn"
              onClick={() => setAiOpen(true)}
              title="Have an AI write multiple-choice questions about tonight's movie"
            >
              ✨ Write with AI
            </button>
            <button className="btn btn-ghost" onClick={addQuestion}>
              + Question
            </button>
          </div>
        </div>
        <p className="inspector-hint">
          Click ● next to the right answer. Questions that aren&apos;t filled in are skipped in the
          show.
        </p>

        <ol className="trivia-question-list">
          {item.questions.map((q, index) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={index}
              count={item.questions.length}
              selected={q.id === selected?.id}
              onSelect={() => setSelectedId(q.id)}
              onPatch={(patch) => patchQuestion(q.id, patch)}
              onMove={(by) => move(index, by)}
              onRemove={() => removeQuestion(q.id)}
            />
          ))}
        </ol>
      </div>

      <div className="slideshow-preview-col">
        {selected && <TriviaPreview item={item} question={selected} index={selectedIndex} />}
      </div>

      {aiOpen && (
        <TriviaAiDialog
          item={item}
          onClose={() => setAiOpen(false)}
          onAdded={(first) => first && setSelectedId(first)}
        />
      )}
    </div>
  )
}

function QuestionCard({
  question,
  index,
  count,
  selected,
  onSelect,
  onPatch,
  onMove,
  onRemove
}: {
  question: TriviaQuestion
  index: number
  count: number
  selected: boolean
  onSelect: () => void
  onPatch: (patch: Partial<TriviaQuestion>) => void
  onMove: (by: number) => void
  onRemove: () => void
}): React.JSX.Element {
  const ready = isPlayableQuestion(question)
  return (
    <li
      className={`trivia-question-card ${selected ? 'trivia-question-selected' : ''}`}
      onFocusCapture={onSelect}
      onMouseDown={onSelect}
    >
      <div className="trivia-question-head">
        <span className="trivia-question-number">Q{index + 1}</span>
        {!ready && <span className="trivia-question-todo">not ready yet</span>}
        <div className="trivia-question-actions">
          <button
            className="btn btn-ghost"
            title="Move up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            ↑
          </button>
          <button
            className="btn btn-ghost"
            title="Move down"
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            ↓
          </button>
          <button className="btn btn-ghost btn-danger" title="Delete question" onClick={onRemove}>
            ✕
          </button>
        </div>
      </div>
      <textarea
        aria-label={`Question ${index + 1}`}
        rows={2}
        maxLength={QUESTION_MAX_CHARS}
        placeholder="Type the question…"
        value={question.question}
        onChange={(e) => onPatch({ question: e.target.value })}
      />
      <div className="trivia-choice-rows" role="radiogroup" aria-label="Right answer">
        {Array.from({ length: MAX_CHOICES }, (_, i) => {
          const right = question.answer === i
          return (
            <div key={i} className={`trivia-choice-row ${right ? 'trivia-choice-row-right' : ''}`}>
              <button
                type="button"
                role="radio"
                aria-checked={right}
                aria-label={`Choice ${TRIVIA_LETTERS[i]} is the right answer`}
                title="Mark as the right answer"
                className="trivia-right-toggle"
                onClick={() => onPatch({ answer: i })}
              >
                {right ? '●' : '○'}
              </button>
              <span className="trivia-choice-letter">{TRIVIA_LETTERS[i]}</span>
              <input
                type="text"
                aria-label={`Choice ${TRIVIA_LETTERS[i]}`}
                maxLength={CHOICE_MAX_CHARS}
                placeholder={i < 2 ? 'Choice' : 'Choice (optional)'}
                value={question.choices[i] ?? ''}
                onChange={(e) => {
                  const choices = [...question.choices]
                  choices[i] = e.target.value
                  onPatch({ choices })
                }}
              />
            </div>
          )
        })}
      </div>
      <input
        type="text"
        className="trivia-note-input"
        aria-label={`Fun fact for question ${index + 1}`}
        maxLength={NOTE_MAX_CHARS}
        placeholder="Fun fact shown with the answer (optional)"
        value={question.note}
        onChange={(e) => onPatch({ note: e.target.value })}
      />
    </li>
  )
}

function TriviaPreview({
  item,
  question,
  index
}: {
  item: TriviaItem
  question: TriviaQuestion
  index: number
}): React.JSX.Element {
  const [reveal, setReveal] = useState(false)
  const theme =
    item.theme === RANDOM_THEME
      ? SLIDE_THEMES[index % SLIDE_THEMES.length]
      : findSlideTheme(item.theme)
  const count = item.questions.filter(isPlayableQuestion).length
  const number = item.questions.slice(0, index + 1).filter(isPlayableQuestion).length
  return (
    <div className="slide-preview">
      <div className="slide-preview-header">
        <span>Preview · question {index + 1}</span>
        <div className="body-style-toggle" role="radiogroup" aria-label="Preview slide">
          <button
            role="radio"
            aria-checked={!reveal}
            className={`btn btn-ghost ${!reveal ? 'body-style-active' : ''}`}
            onClick={() => setReveal(false)}
          >
            Question
          </button>
          <button
            role="radio"
            aria-checked={reveal}
            className={`btn btn-ghost ${reveal ? 'body-style-active' : ''}`}
            onClick={() => setReveal(true)}
          >
            Answer
          </button>
        </div>
      </div>
      <div className="slide-canvas">
        <TriviaSlide
          key={reveal ? 'a' : 'q'}
          question={question}
          number={Math.max(1, number)}
          count={Math.max(1, count)}
          reveal={reveal}
          theme={theme}
          timerSec={0}
        />
      </div>
      <p className="inspector-hint slide-preview-hint">
        {isPlayableQuestion(question)
          ? `In the show: ${item.questionSec}s for the question, then ${item.answerSec}s for the answer.`
          : 'Needs a question, at least two choices, and the right answer marked.'}
      </p>
    </div>
  )
}

/** Optional background track for the round. */
function TriviaMusic({ item }: { item: TriviaItem }): React.JSX.Element {
  const { project, updateItem, importToLibrary } = useProject()
  const audio = project!.library.audio
  const music = item.music

  function pick(fileName: string, displayName: string): void {
    updateItem(item.id, {
      music: music
        ? { ...music, fileName, displayName }
        : {
            kind: 'audio',
            fileName,
            displayName,
            volume: 0.5,
            fadeInSec: 1.5,
            fadeOutSec: 1.5,
            layout: 'corner',
            position: 'bottom-left',
            sizeScale: 3,
            loopSlidesUntilEnd: false
          }
    } as Partial<TriviaItem>)
  }

  async function handleImport(): Promise<void> {
    const files = await importToLibrary('audio')
    if (files[0]) pick(files[0].fileName, files[0].displayName)
  }

  return (
    <div className="field">
      <span className="section-label">Music (optional, plays for the whole round)</span>
      <div className="trivia-music-row">
        <select
          aria-label="Background track"
          value={music?.fileName ?? ''}
          onChange={(e) => {
            const f = audio.find((a) => a.fileName === e.target.value)
            if (f) pick(f.fileName, f.displayName)
            else updateItem(item.id, { music: null } as Partial<TriviaItem>)
          }}
        >
          <option value="">No music</option>
          {audio.map((f) => (
            <option key={f.fileName} value={f.fileName}>
              {f.displayName}
            </option>
          ))}
        </select>
        <button className="btn btn-ghost" onClick={handleImport}>
          🎵 Import…
        </button>
      </div>
      {music && (
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
              updateItem(item.id, {
                music: { ...music, volume: Number(e.target.value) }
              } as Partial<TriviaItem>)
            }
          />
        </label>
      )}
    </div>
  )
}
