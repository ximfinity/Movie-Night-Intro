import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { SlideFrame, SlideshowItem } from '@shared/types'
import type { BackgroundMusicController } from '../../hooks/useBackgroundMusic'
import type { PopupVideoHandle } from './PopupVideoOverlay'
import TransitionLayer from './TransitionLayer'
import { enterDurationMs } from './transitions'
import SlideFrameView from './SlideFrameView'

interface FrameStackEntry {
  key: number
  frame: SlideFrame
}

/** Rotates through a slideshow item's frames (text and/or image), reusing the same
 * TransitionLayer crossfade/slide/zoom mechanics the show player uses between playlist
 * items. The group's single music track spans the whole rotation, started once on mount
 * and faded out once on unmount, independent of which frame is showing. */
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
  const [stack, setStack] = useState<FrameStackEntry[]>(() => [{ key: 0, frame: frames[0] }])
  const advancingRef = useRef(false)

  useEffect(() => {
    const m = item.music
    const popupVideo = popupVideoRef.current
    if (m) {
      if (m.kind === 'video') {
        music.stopImmediately()
        popupVideo?.play(m.fileName, {
          volume: m.volume,
          fadeInSec: m.fadeInSec,
          position: m.position
        })
      } else {
        popupVideo?.stopImmediately()
        music.playTrack(m.fileName, m.volume, m.fadeInSec)
      }
    }
    return () => {
      if (m) {
        if (m.kind === 'video') popupVideo?.fadeOutAndStop(m.fadeOutSec)
        else music.fadeOutAndStop(m.fadeOutSec)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  const currentKey = stack[stack.length - 1].key

  function advanceFrame(fromKey: number): void {
    if (advancingRef.current || fromKey !== currentKey) return
    if (fromKey + 1 >= frames.length) {
      advancingRef.current = true
      onDone()
      return
    }
    advancingRef.current = true
    const nextIndex = fromKey + 1
    setStack((s) => [...s, { key: nextIndex, frame: frames[nextIndex] }])
    const dur = enterDurationMs(item.transition)
    setTimeout(() => {
      setStack((s) => s.filter((l) => l.key === nextIndex))
      advancingRef.current = false
    }, dur + 30)
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
