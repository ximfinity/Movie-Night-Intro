import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlaylistItem } from '@shared/types'
import { shouldLoopPlaylist } from '@shared/countdown'
import { clampIndex, nextItemIndex } from '@shared/showSequence'
import { useProject } from '../../state/useProject'
import { useBackgroundMusic, type BackgroundMusicController } from '../../hooks/useBackgroundMusic'
import ErrorBoundary from '../../components/ErrorBoundary'
import TransitionLayer from './TransitionLayer'
import { enterDurationMs } from './transitions'
import VideoStage from './VideoStage'
import SlideshowStage from './SlideshowStage'
import CountdownOverlay from './CountdownOverlay'
import PopupVideoOverlay, { type PopupVideoHandle } from './PopupVideoOverlay'
import ShowHud from './ShowHud'
import './showplayer.css'

interface StackEntry {
  /** Unique for the life of the show (React key); never reused, even when an item repeats. */
  id: number
  index: number
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

/** Shown in place of a playlist item that failed to render: a moment of black, then on to
 * the next item, so one bad item can't take down the whole show. */
function SkipBrokenItem({ onDone }: { onDone: () => void }): React.JSX.Element {
  useEffect(() => {
    const id = setTimeout(onDone, 400)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <div className="stage" />
}

export default function ShowPlayer({
  startIndex = 0,
  onExit
}: {
  /** Playlist item to begin on instead of the start — e.g. resuming partway through after
   * stopping the show early. Clamped to a valid index. */
  startIndex?: number
  onExit: () => void
}): React.JSX.Element {
  const { project, dir } = useProject()
  const items = project!.items
  const music = useBackgroundMusic(dir!)
  const popupVideoRef = useRef<PopupVideoHandle>(null)

  const [stack, setStack] = useState<StackEntry[]>(() => {
    const index = clampIndex(startIndex, items.length)
    return [{ id: 0, index, item: items[index] }]
  })
  const [paused, setPaused] = useState(false)
  const [ending, setEnding] = useState(false)
  const nextIdRef = useRef(1)
  /** Id of the layer currently on top — the only one allowed to advance the show. Kept in a
   * ref (not derived from state) so a second completion event arriving before React
   * re-renders can't advance twice. */
  const topIdRef = useRef(0)
  const endingRef = useRef(false)

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

  const top = stack[stack.length - 1]

  function show(index: number, replace: boolean): void {
    const id = nextIdRef.current++
    topIdRef.current = id
    const entry = { id, index, item: items[index] }
    if (replace) {
      setStack([entry])
      return
    }
    setStack((s) => [...s, entry])
    // Drop the layers underneath once the new one has finished entering. Keeping "whatever
    // is on top now" (rather than a specific id) means a skip in the meantime can never
    // leave the stack empty.
    setTimeout(() => setStack((s) => s.slice(-1)), enterDurationMs(items[index].transition) + 30)
  }

  function goTo(index: number): void {
    if (endingRef.current || index < 0 || index >= items.length) return
    show(index, true)
  }

  function advance(fromId: number, fromIndex: number): void {
    if (endingRef.current || fromId !== topIdRef.current) return
    // Only ever called from media/timer callbacks, never during render.
    // eslint-disable-next-line react-hooks/purity
    const loop = shouldLoopPlaylist(project!.countdown, Date.now())
    const next = nextItemIndex(fromIndex, items.length, loop)
    if (next === null) {
      endingRef.current = true
      setEnding(true)
      setTimeout(onExit, 900)
      return
    }
    show(next, false)
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        onExit()
      } else if (e.key === ' ') {
        e.preventDefault()
        setPaused((p) => !p)
      } else if (e.key === 'ArrowRight') {
        goTo(top.index + 1)
      } else if (e.key === 'ArrowLeft') {
        goTo(top.index - 1)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top.id])

  return (
    <div className="show-root">
      {stack.map((layer, i) => {
        const isTop = i === stack.length - 1
        const onDone = (): void => advance(layer.id, layer.index)
        return (
          <TransitionLayer
            key={layer.id}
            transition={layer.item.transition}
            exiting={!isTop}
            exitDurationMs={enterDurationMs(top.item.transition)}
          >
            <ErrorBoundary fallback={() => <SkipBrokenItem onDone={onDone} />}>
              <StageFor
                item={layer.item}
                dir={dir!}
                paused={paused && isTop}
                music={music}
                popupVideoRef={popupVideoRef}
                stopBackgroundAudio={stopBackgroundAudio}
                onDone={onDone}
              />
            </ErrorBoundary>
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
