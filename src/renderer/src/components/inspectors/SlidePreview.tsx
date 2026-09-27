import { useState } from 'react'
import type { SlideFrame } from '@shared/types'
import { RANDOM_THEME } from '@shared/slideThemes'
import SlideFrameView from '../../screens/ShowPlayer/SlideFrameView'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'

/** Live, scaled-down rendering of one slide using the show's own renderer, so what you see
 * while editing is exactly what plays. It replays on a loop like the show, picking another
 * random subtitle (and theme, when set to random) each time. */
export default function SlidePreview({
  frame,
  dir,
  index,
  count
}: {
  frame: SlideFrame
  dir: string
  index: number
  count: number
}): React.JSX.Element {
  const [roll, setRoll] = useState(0)
  // Replay (re-running the entrance animation) once edits settle, not on every keystroke.
  const contentKey = useDebouncedValue(
    JSON.stringify([
      frame.title,
      frame.subtitleOptions,
      frame.theme,
      frame.textAnimation,
      frame.content,
      frame.backgroundImage,
      frame.durationSec
    ]),
    450
  )
  const variations = frame.subtitleOptions.filter((s) => s.trim()).length

  return (
    <div className="slide-preview">
      <div className="slide-preview-header">
        <span>
          Preview · slide {index + 1} of {count}
        </span>
        <button
          className="btn btn-ghost slide-preview-shuffle"
          onClick={() => setRoll((r) => r + 1)}
          title="Show another random pick"
        >
          🎲 Shuffle
        </button>
      </div>
      <div className="slide-canvas">
        <SlideFrameView
          key={`${frame.id}:${contentKey}:${roll}`}
          frame={frame}
          dir={dir}
          paused={false}
          preview
          onDone={() => setRoll((r) => r + 1)}
        />
      </div>
      <p className="inspector-hint slide-preview-hint">
        {frame.content === 'text' && variations > 1
          ? `Replays every ${frame.durationSec}s with another of the ${variations} lines${frame.theme === RANDOM_THEME ? ' and a random theme' : ''} — every line shows once before any repeats.`
          : `Replays every ${frame.durationSec}s, just like the show.`}
      </p>
    </div>
  )
}
