import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlaylistItem } from '@shared/types'
import { targetTimeToEpoch } from '@shared/countdown'
import { useProject } from '../../state/useProject'
import { useBackgroundMusic, type BackgroundMusicController } from '../../hooks/useBackgroundMusic'
import TransitionLayer from './TransitionLayer'
import { enterDurationMs } from './transitions'
import VideoStage from './VideoStage'
import SlideshowStage from './SlideshowStage'
import CountdownOverlay from './CountdownOverlay'
import PopupVideoOverlay, { type PopupVideoHandle } from './PopupVideoOverlay'
import ShowHud from './ShowHud'
import './showplayer.css'

interface StackEntry {
  key: number
  item: PlaylistItem
}

function StageFor({
  item,
  dir,
  paused,
  music,
  popupVideoRef,
  stopBackgroundAudio,
  onDone
}: {
  item: PlaylistItem
  dir: string
  paused: boolean
  music: BackgroundMusicController
  popupVideoRef: React.RefObject<PopupVideoHandle | null>
  stopBackgroundAudio: () => void
  onDone: () => void
}): React.JSX.Element {
  switch (item.type) {
    case 'video':
      return (
        <VideoStage
          item={item}
          dir={dir}
          paused={paused}
          stopBackgroundAudio={stopBackgroundAudio}
          onDone={onDone}
        />
      )
    case 'slideshow':
      return (
        <SlideshowStage
          item={item}
          dir={dir}
          paused={paused}
          music={music}
          popupVideoRef={popupVideoRef}
          onDone={onDone}
        />
      )
  }
}

export default function ShowPlayer({ onExit }: { onExit: () => void }): React.JSX.Element {
  const { project, dir } = useProject()
  const items = project!.items
  const music = useBackgroundMusic(dir!)
  const popupVideoRef = useRef<PopupVideoHandle>(null)

  const [stack, setStack] = useState<StackEntry[]>(() => [{ key: 0, item: items[0] }])
  const [paused, setPaused] = useState(false)
  const [ending, setEnding] = useState(false)
  const advancingRef = useRef(false)
  /** How many times the playlist has looped back to the top, folded into each stack
   * entry's key (key = loopCount * items.length + index) so keys stay unique forever. */
  const loopCountRef = useRef(0)

  // Only ever called from advance()/goTo(), themselves only reachable from event
  // callbacks (never during render), so reading the live clock here is safe despite the
  // purity lint rule's conservative static analysis of the enclosing component body.
  function shouldLoopPlaylist(): boolean {
    const cd = project!.countdown
    if (!cd.enabled || cd.mode !== 'clock' || !cd.loopPlaylistUntilShowtime) return false
    // eslint-disable-next-line react-hooks/purity
    return targetTimeToEpoch(cd.targetTime) > Date.now()
  }

  const stopBackgroundAudio = useCallback(() => {
    music.stopImmediately()
    popupVideoRef.current?.stopImmediately()
  }, [music])

  useEffect(() => {
    window.api.setFullscreen(true)
    return () => {
      window.api.setFullscreen(false)
    }
  }, [])

  useEffect(() => {
    return () => music.stopImmediately()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentKey = stack[stack.length - 1].key
  const currentIndex = currentKey % items.length

  function goTo(index: number): void {
    if (index < 0 || index >= items.length) return
    advancingRef.current = false
    setStack([{ key: loopCountRef.current * items.length + index, item: items[index] }])
  }

  function advance(fromKey: number): void {
    if (advancingRef.current || fromKey !== currentKey) return
    const fromIndex = fromKey % items.length
    const atEnd = fromIndex + 1 >= items.length
    if (atEnd && !shouldLoopPlaylist()) {
      advancingRef.current = true
      setEnding(true)
      setTimeout(onExit, 900)
      return
    }
    advancingRef.current = true
    if (atEnd) loopCountRef.current += 1
    const nextIndex = atEnd ? 0 : fromIndex + 1
    const nextKey = loopCountRef.current * items.length + nextIndex
    setStack((s) => [...s, { key: nextKey, item: items[nextIndex] }])
    const dur = enterDurationMs(items[nextIndex].transition)
    setTimeout(() => {
      setStack((s) => s.filter((l) => l.key === nextKey))
      advancingRef.current = false
    }, dur + 30)
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        onExit()
      } else if (e.key === ' ') {
        e.preventDefault()
        setPaused((p) => !p)
      } else if (e.key === 'ArrowRight') {
        goTo(currentIndex + 1)
      } else if (e.key === 'ArrowLeft') {
        goTo(currentIndex - 1)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey])

  const topTransition = stack[stack.length - 1].item.transition

  return (
    <div className="show-root">
      {stack.map((layer, i) => {
        const isTop = i === stack.length - 1
        return (
          <TransitionLayer
            key={layer.key}
            transition={layer.item.transition}
            exiting={!isTop}
            exitDurationMs={enterDurationMs(topTransition)}
          >
            <StageFor
              item={layer.item}
              dir={dir!}
              paused={paused && isTop}
              music={music}
              popupVideoRef={popupVideoRef}
              stopBackgroundAudio={stopBackgroundAudio}
              onDone={() => advance(layer.key)}
            />
          </TransitionLayer>
        )
      })}
      <PopupVideoOverlay ref={popupVideoRef} dir={dir!} paused={paused} />
      <CountdownOverlay config={project!.countdown} paused={paused} />
      {ending && <div className="show-fade-black" />}
      <ShowHud paused={paused} />
    </div>
  )
}
