import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { SlideFrame, SlideshowItem } from '@shared/types'
import type { BackgroundMusicController } from '../../hooks/useBackgroundMusic'
import type { PopupVideoHandle } from './PopupVideoOverlay'
import TransitionLayer from './TransitionLayer'
import { enterDurationMs } from './transitions'
import SlideFrameView from './SlideFrameView'

interface FrameStackEntry {
  /** An ever-incrementing step counter (not a frame index) so slides can loop
   * indefinitely — the frame shown is `frames[key % frames.length]`. */
  key: number
  frame: SlideFrame
}

/** Rotates through a slideshow item's frames (text and/or image), reusing the same
 * TransitionLayer crossfade/slide/zoom mechanics the show player uses between playlist
 * items. The group's single music track spans the whole rotation, started once on mount
 * and faded out once on unmount, independent of which frame is showing. When the music is
 * a pop-up video with "loop until it ends" enabled, the slides keep rotating in a loop and
 * the item only finishes when the video itself ends, rather than after one pass through
 * the frames. */
export default function SlideshowStage({
  item,
  dir,
  paused,
  music,
  popupVideoRef,
  onDone
}: {
  item: SlideshowItem
  dir: string
  paused: boolean
  music: BackgroundMusicController
  popupVideoRef: RefObject<PopupVideoHandle | null>
  onDone: () => void
}): React.JSX.Element {
  const frames = item.frames
  const loopUntilVideoEnds = item.music?.kind === 'video' && item.music.loopSlidesUntilEnd
  const [stack, setStack] = useState<FrameStackEntry[]>(() => [{ key: 0, frame: frames[0] }])
  /** Key of the frame on top; only it may advance (ref so a duplicate completion event
   * before the next render can't advance twice). */
  const topKeyRef = useRef(0)
  const finishedRef = useRef(false)

  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    const m = item.music
    const popupVideo = popupVideoRef.current
    let token: number | undefined
    if (m) {
      if (m.kind === 'video') {
        music.stopImmediately()
        token = popupVideo?.play(m.fileName, {
          volume: m.volume,
          fadeInSec: m.fadeInSec,
          position: m.position,
          sizeScale: m.sizeScale,
          onEnded: m.loopSlidesUntilEnd ? () => onDoneRef.current() : undefined
        })
      } else {
        popupVideo?.stopImmediately()
        token = music.playTrack(m.fileName, m.volume, m.fadeInSec)
      }
    }
    return () => {
      if (!m || token === undefined) return
      if (m.kind === 'video') popupVideo?.fadeOutAndStop(token, m.fadeOutSec)
      else music.fadeOutAndStop(token, m.fadeOutSec)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  function advanceFrame(fromKey: number): void {
    if (finishedRef.current || fromKey !== topKeyRef.current) return
    const nextStep = fromKey + 1
    if (!loopUntilVideoEnds && nextStep >= frames.length) {
      finishedRef.current = true
      onDone()
      return
    }
    topKeyRef.current = nextStep
    const nextFrame = frames[nextStep % frames.length]
    setStack((s) => [...s, { key: nextStep, frame: nextFrame }])
    setTimeout(() => setStack((s) => s.slice(-1)), enterDurationMs(item.transition) + 30)
  }

  return (
    <>
      {stack.map((layer, i) => {
        const isTop = i === stack.length - 1
        return (
          <TransitionLayer
            key={layer.key}
            transition={item.transition}
            exiting={!isTop}
            exitDurationMs={enterDurationMs(item.transition)}
          >
            <SlideFrameView
              frame={layer.frame}
              dir={dir}
              paused={paused && isTop}
              onDone={() => advanceFrame(layer.key)}
            />
          </TransitionLayer>
        )
      })}
    </>
  )
}
