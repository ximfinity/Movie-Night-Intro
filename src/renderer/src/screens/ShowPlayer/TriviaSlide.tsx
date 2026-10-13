import type { TriviaQuestion } from '@shared/types'
import type { SlideThemeDef } from '@shared/slideThemes'
import { TRIVIA_LETTERS, playableChoices } from '@shared/trivia'
import './trivia.css'

/** One trivia screen: the question with its lettered choices and a countdown bar, or (when
 * `reveal` is set) the answer slide with the right choice lit up and the fun fact. Sized
 * with container units, so the show and the editor preview look the same. */
export default function TriviaSlide({
  question,
  number,
  count,
  reveal,
  theme,
  timerSec,
  paused = false
}: {
  question: TriviaQuestion
  number: number
  count: number
  reveal: boolean
  theme: SlideThemeDef
  /** Length of the countdown bar on the question slide (none when 0). */
  timerSec: number
  paused?: boolean
}): React.JSX.Element {
  const { choices, answer } = playableChoices(question)
  const accent = `linear-gradient(135deg, ${theme.titleFrom}, ${theme.titleTo})`
  return (
    <div
      className={`stage trivia-stage ${reveal ? 'trivia-reveal' : ''}`}
      style={{ background: theme.background, color: theme.textColor }}
    >
      <div className="trivia-kicker" style={{ color: theme.titleFrom }}>
        {reveal ? 'Answer' : `Question ${number} of ${count}`}
      </div>
      <h1 className="trivia-question">{question.question}</h1>
      <ol className={`trivia-choices trivia-choices-${choices.length}`}>
        {choices.map((c, i) => {
          const right = reveal && i === answer
          return (
            <li
              key={i}
              className={`trivia-choice ${right ? 'trivia-choice-right' : ''} ${reveal && !right ? 'trivia-choice-wrong' : ''}`}
              style={{ animationDelay: reveal ? undefined : `${0.25 + i * 0.12}s` }}
            >
              <span className="trivia-letter" style={right ? undefined : { background: accent }}>
                {right ? '✓' : TRIVIA_LETTERS[i]}
              </span>
              <span className="trivia-choice-text">{c}</span>
            </li>
          )
        })}
      </ol>
      {reveal && question.note.trim() && <p className="trivia-note">{question.note}</p>}
      {!reveal && timerSec > 0 && (
        <div className="trivia-timer">
          <div
            className="trivia-timer-fill"
            style={{
              background: accent,
              animationDuration: `${timerSec}s`,
              animationPlayState: paused ? 'paused' : 'running'
            }}
          />
        </div>
      )}
    </div>
  )
}
