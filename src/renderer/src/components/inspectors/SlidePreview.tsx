import { useState } from 'react'
import type { SlideFrame, SlideMusic } from '@shared/types'
import { splitVideoSide } from '@shared/factory'
import { RANDOM_THEME } from '@shared/slideThemes'
import SlideFrameView from '../../screens/ShowPlayer/SlideFrameView'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import {
  POPUP_VIDEO_BASE_HEIGHT,
  POPUP_VIDEO_BASE_WIDTH
} from '../../screens/ShowPlayer/PopupVideoOverlay'

/** Live, scaled-down rendering of one slide using the show's own renderer, so what you see
 * while editing is exactly what plays. It replays on a loop like the show, picking another
 * random subtitle (and theme, when set to random) each time. */
export default function SlidePreview({
  frame,
  dir,
  index,
  count,
  music = null
}: {
  frame: SlideFrame
  dir: string
  index: number
  count: number
  /** The group's music: a pop-up video is drawn as a placeholder box where it will play. */
  music?: SlideMusic | null
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
  const video = music?.kind === 'video' ? music : null
  const videoSide = splitVideoSide(video)
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
          videoSide={videoSide}
          onDone={() => setRoll((r) => r + 1)}
        />
        {video && <VideoPlaceholder music={video} />}
      </div>
      <p className="inspector-hint slide-preview-hint">
        {frame.content === 'text' && variations > 1 && frame.bodyStyle !== 'list'
          ? `Replays every ${frame.durationSec}s with another of the ${variations} lines${frame.theme === RANDOM_THEME ? ' and a random theme' : ''} — every line shows once before any repeats.`
          : `Replays every ${frame.durationSec}s, just like the show.`}
      </p>
    </div>
  )
}

/** Where the group's pop-up video will play, so you can see what it covers. The corner box
 * is sized as it would be on a 1920x1080 screen. */
function VideoPlaceholder({ music }: { music: SlideMusic }): React.JSX.Element {
  const corner = music.layout === 'corner'
  const style = corner
    ? {
        width: `${((POPUP_VIDEO_BASE_WIDTH * music.sizeScale) / 1920) * 100}cqw`,
        height: `${((POPUP_VIDEO_BASE_HEIGHT * music.sizeScale) / 1080) * 100}cqh`
      }
    : undefined
  return (
    <div
      className={`slide-preview-video ${corner ? `slide-preview-video-${music.position}` : `slide-preview-video-split slide-preview-video-${music.layout}`}`}
      style={style}
    >
      <span>🎬 {music.displayName}</span>
    </div>
  )
}
