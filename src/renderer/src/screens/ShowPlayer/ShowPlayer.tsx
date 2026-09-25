import { useEffect, useRef, useState } from 'react'
import type { PlaylistItem } from '@shared/types'
import { useProject } from '../../state/useProject'
import { useBackgroundMusic, type BackgroundMusicController } from '../../hooks/useBackgroundMusic'
import TransitionLayer from './TransitionLayer'
import { enterDurationMs } from './transitions'
import VideoStage from './VideoStage'
import SlideStage from './SlideStage'
import CountdownOverlay from './CountdownOverlay'
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
  onDone
}: {
  item: PlaylistItem
  dir: string
  paused: boolean
  music: BackgroundMusicController
  onDone: () => void
}): React.JSX.Element {
  switch (item.type) {
    case 'video':
      return <VideoStage item={item} dir={dir} paused={paused} onDone={onDone} />
    case 'slide':
      return <SlideStage item={item} dir={dir} paused={paused} music={music} onDone={onDone} />
  }
}

export default function ShowPlayer({ onExit }: { onExit: () => void }): React.JSX.Element {
  const { project, dir } = useProject()
  const items = project!.items
  const music = useBackgroundMusic(dir!)

  const [stack, setStack] = useState<StackEntry[]>(() => [{ key: 0, item: items[0] }])
  const [paused, setPaused] = useState(false)
  const [ending, setEnding] = useState(false)
  const advancingRef = useRef(false)

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

  function goTo(index: number): void {
    if (index < 0 || index >= items.length) return
    advancingRef.current = false
    setStack([{ key: index, item: items[index] }])
  }

  function advance(fromKey: number): void {
    if (advancingRef.current || fromKey !== currentKey) return
    if (fromKey + 1 >= items.length) {
      advancingRef.current = true
      setEnding(true)
      setTimeout(onExit, 900)
      return
    }
    advancingRef.current = true
    const nextIndex = fromKey + 1
    setStack((s) => [...s, { key: nextIndex, item: items[nextIndex] }])
    const dur = enterDurationMs(items[nextIndex].transition)
    setTimeout(() => {
      setStack((s) => s.filter((l) => l.key === nextIndex))
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
        goTo(currentKey + 1)
      } else if (e.key === 'ArrowLeft') {
        goTo(currentKey - 1)
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
              onDone={() => advance(layer.key)}
            />
          </TransitionLayer>
        )
      })}
      <CountdownOverlay config={project!.countdown} paused={paused} />
      {ending && <div className="show-fade-black" />}
      <ShowHud paused={paused} />
    </div>
  )
}
