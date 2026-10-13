import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { TransitionStyle, TriviaItem } from '@shared/types'
import { RANDOM_THEME, SLIDE_THEMES, findSlideTheme } from '@shared/slideThemes'
import { isPlayableQuestion } from '@shared/trivia'
import type { BackgroundMusicController } from '../../hooks/useBackgroundMusic'
import { useFrameTimer } from '../../hooks/useFrameTimer'
import type { PopupVideoHandle } from './PopupVideoOverlay'
import TransitionLayer from './TransitionLayer'
import { enterDurationMs } from './transitions'
import TriviaSlide from './TriviaSlide'

interface Step {
  /** Even steps are questions, odd steps their answers. */
  key: number
  transition: TransitionStyle
}

/** Plays a trivia round: each question with its choices for questionSec, then a second
 * slide revealing the answer for answerSec. Questions that aren't filled in are skipped. */
export default function TriviaStage({
  item,
  paused,
  music,
  popupVideoRef,
  onDone
}: {
  item: TriviaItem
  paused: boolean
  music: BackgroundMusicController
  popupVideoRef: RefObject<PopupVideoHandle | null>
  onDone: () => void
}): React.JSX.Element {
  const [questions] = useState(() => item.questions.filter(isPlayableQuestion))
  const [theme] = useState(() =>
    item.theme === RANDOM_THEME
      ? SLIDE_THEMES[Math.floor(Math.random() * SLIDE_THEMES.length)]
      : findSlideTheme(item.theme)
  )
  const [stack, setStack] = useState<Step[]>([{ key: 0, transition: item.transition }])
  const topKeyRef = useRef(0)
  const finishedRef = useRef(false)
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    const m = item.music
    const popupVideo = popupVideoRef.current
    popupVideo?.stopImmediately()
    if (!m) return
    const token = music.playTrack(m.fileName, m.volume, m.fadeInSec)
    return () => music.fadeOutAndStop(token, m.fadeOutSec)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  // Nothing to ask: move straight on.
  useEffect(() => {
    if (questions.length > 0) return
    const id = setTimeout(() => onDoneRef.current(), 300)
    return () => clearTimeout(id)
  }, [questions.length])

  function advance(fromKey: number): void {
    if (finishedRef.current || fromKey !== topKeyRef.current) return
    const next = fromKey + 1
    if (next >= questions.length * 2) {
      finishedRef.current = true
      onDone()
      return
    }
    topKeyRef.current = next
    // Question → its answer is a quick crossfade; the group's transition leads into the
    // next question.
    const transition: TransitionStyle = next % 2 === 1 ? 'crossfade' : item.transition
    setStack((s) => [...s, { key: next, transition }])
    setTimeout(() => setStack((s) => s.slice(-1)), enterDurationMs(transition) + 30)
  }

  if (questions.length === 0) return <div className="stage" />

  return (
    <>
      {stack.map((step, i) => {
        const isTop = i === stack.length - 1
        return (
          <TransitionLayer
            key={step.key}
            transition={step.transition}
            exiting={!isTop}
            exitDurationMs={enterDurationMs(step.transition)}
          >
            <TriviaStep
              item={item}
              step={step.key}
              questions={questions}
              theme={theme}
              paused={paused && isTop}
              onDone={() => advance(step.key)}
            />
          </TransitionLayer>
        )
      })}
    </>
  )
}

function TriviaStep({
  item,
  step,
  questions,
  theme,
  paused,
  onDone
}: {
  item: TriviaItem
  step: number
  questions: TriviaItem['questions']
  theme: ReturnType<typeof findSlideTheme>
  paused: boolean
  onDone: () => void
}): React.JSX.Element {
  const reveal = step % 2 === 1
  const index = Math.floor(step / 2)
  useFrameTimer(reveal ? item.answerSec : item.questionSec, paused, onDone)
  return (
    <TriviaSlide
      question={questions[index]}
      number={index + 1}
      count={questions.length}
      reveal={reveal}
      theme={theme}
      timerSec={reveal ? 0 : item.questionSec}
      paused={paused}
    />
  )
}
