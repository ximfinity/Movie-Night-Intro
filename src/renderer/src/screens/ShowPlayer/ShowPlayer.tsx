import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlaylistItem, SlideshowItem } from '@shared/types'
import {
  countdownActive,
  createShowClock,
  holdRollAt,
  offsetForStartIn,
  shouldLoopUntil,
  showtimeEpoch,
  type ShowClock
} from '@shared/countdown'
import { hasFeatureMovie } from '@shared/factory'
import { clampIndex, nextItemIndex } from '@shared/showSequence'
import type { RemoteCommand, RemoteState } from '@shared/remote'
import { useProject } from '../../state/useProject'
import { useBackgroundMusic, type BackgroundMusicController } from '../../hooks/useBackgroundMusic'
import { useRemoteCommands, useRemoteState } from '../../hooks/useRemote'
import { getShowVolume, setShowVolume } from '../../lib/showVolume'
import { itemTitle } from '../../lib/itemMeta'
import { userMessage } from '../../lib/errors'
import ErrorBoundary from '../../components/ErrorBoundary'
import TransitionLayer from './TransitionLayer'
import { enterDurationMs } from './transitions'
import VideoStage from './VideoStage'
import SlideshowStage from './SlideshowStage'
import CountdownOverlay from './CountdownOverlay'
import PopupVideoOverlay, { type PopupVideoHandle } from './PopupVideoOverlay'
import ShowHud from './ShowHud'
import MovieStage, { type MovieHandle } from './MovieStage'
import { EndCard, FeatureIntro, HandoffScreen, HoldScreen } from './FeatureScreens'
import './showplayer.css'

/** pre-show playlist → hold ("starting shortly") → intro (bumper/fade/clip) → the movie
 * (built in, or handed off to a player/browser) → thanks card. */
type Phase = 'preshow' | 'hold' | 'intro' | 'movie' | 'handoff' | 'ended'

interface StackEntry {
  /** Unique for the life of the show (React key); never reused, even when an item repeats. */
  id: number
  index: number
  item: PlaylistItem
}

/** Showtime adjustments made from the remote in clock mode, kept for the rest of the
 * session so stopping and restarting the show doesn't undo them. */
const sessionOffsets = new Map<string, number>()

const ESC_CONFIRM_MS = 3000

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
  resumeAtSec,
  onExit
}: {
  /** Playlist item to begin on instead of the start — e.g. resuming partway through after
   * stopping the show early. Clamped to a valid index. */
  startIndex?: number
  /** Skip straight to the movie, this many seconds in (resuming an interrupted showing). */
  resumeAtSec?: number
  onExit: () => void
}): React.JSX.Element {
  const { project, dir } = useProject()
  const items = project!.items
  const countdown = project!.countdown
  /** On, with a real showtime (a cleared clock time means no countdown). */
  const hasShowtime = countdownActive(countdown)
  const feature = project!.feature
  const hasFeature = hasFeatureMovie(feature)
  const music = useBackgroundMusic(dir!)
  const popupVideoRef = useRef<PopupVideoHandle>(null)
  const movieRef = useRef<MovieHandle>(null)

  const [phase, setPhaseState] = useState<Phase>(() =>
    resumeAtSec !== undefined && hasFeature ? 'movie' : items.length === 0 ? 'hold' : 'preshow'
  )
  const phaseRef = useRef(phase)
  const setPhase = (p: Phase): void => {
    phaseRef.current = p
    setPhaseState(p)
  }

  const [stack, setStack] = useState<StackEntry[]>(() => {
    if (items.length === 0) return []
    const index = clampIndex(startIndex, items.length)
    return [{ id: 0, index, item: items[index] }]
  })
  const [paused, setPausedState] = useState(false)
  const pausedRef = useRef(false)
  const [ending, setEnding] = useState(false)
  const nextIdRef = useRef(1)
  /** Id of the layer currently on top — the only one allowed to advance the show. Kept in a
   * ref (not derived from state) so a second completion event arriving before React
   * re-renders can't advance twice. */
  const topIdRef = useRef(0)
  const endingRef = useRef(false)

  const clockRef = useRef<ShowClock>(
    createShowClock(
      // eslint-disable-next-line react-hooks/purity -- captured once, at show start
      Date.now(),
      countdown.mode === 'clock' ? (sessionOffsets.get(project!.id) ?? 0) : 0
    )
  )
  const [wrappingUp, setWrappingUp] = useState(false)
  const wrapUpRef = useRef(false)
  const [rollAt, setRollAt] = useState<number | null>(null)
  const holdEnteredAtRef = useRef(0)
  const holdIgnoresShowtimeRef = useRef(false)
  const [handoff, setHandoff] = useState<{
    to: 'player' | 'browser' | null
    note: string | null
    error: string | null
  }>({ to: null, note: null, error: null })
  const [subtitlesOn, setSubtitlesOn] = useState(true)
  const [hasSubtitles, setHasSubtitles] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const escArmedUntilRef = useRef(0)

  const getShowtime = useCallback(
    (now: number) => showtimeEpoch(countdown, clockRef.current, now),
    [countdown]
  )

  function flash(text: string): void {
    setMessage(text)
    clearTimeout(messageTimerRef.current)
    messageTimerRef.current = setTimeout(() => setMessage(null), 2200)
  }

  function setPaused(flag: boolean): void {
    if (flag === pausedRef.current) return
    pausedRef.current = flag
    setPausedState(flag)
    // A paused 'duration' countdown holds still.
    // eslint-disable-next-line react-hooks/purity -- only called from events and timers
    const now = Date.now()
    const c = clockRef.current
    clockRef.current = flag
      ? { ...c, pausedSince: now }
      : {
          ...c,
          pausedTotalMs: c.pausedTotalMs + (c.pausedSince !== null ? now - c.pausedSince : 0),
          pausedSince: null
        }
  }

  const stopBackgroundAudio = useCallback(() => {
    music.stopImmediately()
    popupVideoRef.current?.stopImmediately()
  }, [music])

  useEffect(() => {
    window.api.setFullscreen(true)
    return () => {
      window.api.setFullscreen(false)
      clearTimeout(messageTimerRef.current)
    }
  }, [])

  const top = stack[stack.length - 1] ?? null

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
    if (phaseRef.current !== 'preshow' || endingRef.current) return
    if (index < 0 || index >= items.length) return
    show(index, true)
  }

  function enterHold(ignoreShowtime: boolean): void {
    // eslint-disable-next-line react-hooks/purity -- only called from events and timers
    const now = Date.now()
    popupVideoRef.current?.stopImmediately()
    holdEnteredAtRef.current = now
    holdIgnoresShowtimeRef.current = ignoreShowtime
    setRollAt(
      holdRollAt(
        feature.startMode,
        feature.holdSec,
        now,
        hasShowtime && !ignoreShowtime ? getShowtime(now) : null
      )
    )
    wrapUpRef.current = false
    setWrappingUp(false)
    setPaused(false)
    setPhase('hold')
  }

  /** After the showtime moved (remote), an auto hold screen re-times itself. */
  function retimeHold(): void {
    if (phaseRef.current !== 'hold') return
    holdIgnoresShowtimeRef.current = false
    setRollAt(
      holdRollAt(
        feature.startMode,
        feature.holdSec,
        holdEnteredAtRef.current,
        // eslint-disable-next-line react-hooks/purity -- only called from events and timers
        hasShowtime ? getShowtime(Date.now()) : null
      )
    )
  }

  function advance(fromId: number, fromIndex: number): void {
    if (endingRef.current || phaseRef.current !== 'preshow' || fromId !== topIdRef.current) return
    // Only ever called from media/timer callbacks, never during render.
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now()
    const showtime = hasShowtime ? getShowtime(now) : null
    // At showtime (or when asked to wrap up) the item that was playing has now finished,
    // so the hold screen comes up.
    if (hasFeature && (wrapUpRef.current || (showtime !== null && now >= showtime))) {
      enterHold(wrapUpRef.current)
      return
    }
    const loop = showtime !== null && shouldLoopUntil(countdown, showtime, now)
    const next = nextItemIndex(fromIndex, items.length, loop)
    if (next === null) {
      if (hasFeature) {
        enterHold(false)
        return
      }
      endingRef.current = true
      setEnding(true)
      setTimeout(onExit, 900)
      return
    }
    show(next, false)
  }

  function startMovie(): void {
    if (!hasFeature) return
    const p = phaseRef.current
    if (p !== 'preshow' && p !== 'hold') return
    popupVideoRef.current?.stopImmediately()
    wrapUpRef.current = false
    setWrappingUp(false)
    setPaused(false)
    setPhase('intro')
  }

  function handOffTo(to: 'player' | 'browser', note: string | null = null): void {
    music.stopImmediately()
    setHandoff({ to, note, error: null })
    setPhase('handoff')
    window.api.handOff()
  }

  function showProblem(error: string): void {
    music.stopImmediately()
    setHandoff({ to: null, note: null, error })
    setPhase('handoff')
  }

  async function rollMovie(): Promise<void> {
    try {
      if (feature.source === 'stream') {
        await window.api.openStream(feature.streamUrl)
        handOffTo('browser')
      } else if (feature.player === 'external') {
        await window.api.openInPlayer(feature.filePath)
        handOffTo('player')
      } else {
        setPhase('movie')
      }
    } catch (err) {
      showProblem(userMessage(err))
    }
  }

  async function movieFailed(detail: string): Promise<void> {
    console.warn('Built-in player could not play the movie:', detail)
    try {
      await window.api.openInPlayer(feature.filePath)
      handOffTo(
        'player',
        "The built-in player couldn't play this file, so it opened in your video player."
      )
    } catch (err) {
      showProblem(userMessage(err))
    }
  }

  function showEndCard(): void {
    const p = phaseRef.current
    if (p === 'ended' || p === 'preshow') return
    if (p === 'movie') window.api.clearResumePoint().catch(() => {})
    if (p === 'handoff') window.api.bringBack()
    music.stopImmediately()
    setPaused(false)
    setPhase('ended')
  }

  function exit(): void {
    if (phaseRef.current === 'handoff') window.api.bringBack()
    onExit()
  }

  function moveShowtime(offsetMs: number, label: string): void {
    if (!Number.isFinite(offsetMs)) return
    clockRef.current = { ...clockRef.current, offsetMs }
    if (countdown.mode === 'clock') sessionOffsets.set(project!.id, offsetMs)
    retimeHold()
    flash(label)
  }

  function runCommand({ cmd, value = 0 }: RemoteCommand): void {
    const p = phaseRef.current
    switch (cmd) {
      case 'togglePause':
        if (p === 'preshow' || p === 'hold' || p === 'movie') setPaused(!pausedRef.current)
        break
      case 'next':
        if (top) goTo(top.index + 1)
        break
      case 'prev':
        if (top) goTo(top.index - 1)
        break
      case 'volume': {
        setShowVolume(getShowVolume() + value)
        flash(`Volume ${Math.round(getShowVolume() * 100)}%`)
        break
      }
      case 'shiftShowtime':
        if (!hasShowtime) break
        moveShowtime(
          clockRef.current.offsetMs + value * 60_000,
          `Showtime moved ${value > 0 ? '+' : '−'}${Math.abs(value)} min`
        )
        break
      case 'startIn':
        if (!hasShowtime) break
        moveShowtime(
          // eslint-disable-next-line react-hooks/purity -- only called from events
          offsetForStartIn(countdown, clockRef.current, Date.now(), value),
          `Showtime in ${value} min`
        )
        break
      case 'wrapUp':
        if (p === 'preshow' && hasFeature) {
          wrapUpRef.current = true
          setWrappingUp(true)
          flash('The movie starts after this item')
        }
        break
      case 'cancelWrapUp':
        wrapUpRef.current = false
        setWrappingUp(false)
        break
      case 'startMovie':
        startMovie()
        break
      case 'toggleSubtitles':
        if (hasSubtitles) {
          setSubtitlesOn((on) => !on)
          flash(subtitlesOn ? 'Subtitles off' : 'Subtitles on')
        }
        break
      case 'seek':
        if (p === 'movie') movieRef.current?.seek(value)
        break
      case 'showEndCard':
        showEndCard()
        break
      case 'exitShow':
        exit()
        break
      case 'startShow':
      case 'resumeMovie':
        break
    }
  }

  useEffect(() => {
    // A show with nothing in the playlist opens on the hold screen.
    if (phaseRef.current === 'hold') enterHold(false)
    return () => music.stopImmediately()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useRemoteCommands(runCommand)

  useRemoteState((): Partial<RemoteState> => {
    const now = Date.now()
    const movieStatus = phase === 'movie' ? movieRef.current?.status() : null
    return {
      phase,
      projectName: project!.name,
      movieTitle: feature.title,
      itemTitle: top ? itemTitle(top.item) : '',
      itemIndex: top?.index ?? 0,
      itemCount: items.length,
      paused: phase === 'movie' ? (movieStatus?.paused ?? false) : paused,
      showtimeAt: hasShowtime ? getShowtime(now) : null,
      wrappingUp,
      rollAt: phase === 'hold' ? rollAt : null,
      hasFeature,
      volume: getShowVolume(),
      movie: movieStatus ? { ...movieStatus, hasSubtitles, subtitlesOn } : null,
      handoffTo: phase === 'handoff' ? handoff.to : null
    }
  })

  const commandRef = useRef(runCommand)
  useEffect(() => {
    commandRef.current = runCommand
  })

  useEffect(() => {
    function handleKey(e: KeyboardEvent): void {
      const run = commandRef.current
      const p = phaseRef.current
      switch (e.key) {
        case 'Escape':
          // Stopping the movie by accident would be bad: the first Esc only warns.
          if (p === 'movie' && Date.now() > escArmedUntilRef.current) {
            escArmedUntilRef.current = Date.now() + ESC_CONFIRM_MS
            flash('Press Esc again to stop the movie')
            return
          }
          run({ cmd: 'exitShow' })
          break
        case ' ':
          e.preventDefault()
          run({ cmd: 'togglePause' })
          break
        case 'ArrowRight':
          run(p === 'movie' ? { cmd: 'seek', value: 10 } : { cmd: 'next' })
          break
        case 'ArrowLeft':
          run(p === 'movie' ? { cmd: 'seek', value: -10 } : { cmd: 'prev' })
          break
        case 'ArrowUp':
          e.preventDefault()
          run({ cmd: 'volume', value: 0.1 })
          break
        case 'ArrowDown':
          e.preventDefault()
          run({ cmd: 'volume', value: -0.1 })
          break
        case 'Enter':
          // The go button: wrap up the pre-show (twice: start right away), start the movie
          // from the hold screen, or bring up the thanks card after a handed-off movie.
          if (p === 'preshow') run({ cmd: wrapUpRef.current ? 'startMovie' : 'wrapUp' })
          else if (p === 'hold') run({ cmd: 'startMovie' })
          else if (p === 'handoff') run({ cmd: 'showEndCard' })
          break
        case 'm':
        case 'M':
          run({ cmd: 'startMovie' })
          break
        case 'c':
        case 'C':
          run({ cmd: 'toggleSubtitles' })
          break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const groupById = (id: string | null): SlideshowItem | null => {
    const found = items.find((it) => it.id === id)
    return found?.type === 'slideshow' ? found : null
  }

  return (
    <div className="show-root">
      {phase === 'preshow' &&
        stack.map((layer, i) => {
          const isTop = i === stack.length - 1
          const onDone = (): void => advance(layer.id, layer.index)
          return (
            <TransitionLayer
              key={layer.id}
              transition={layer.item.transition}
              exiting={!isTop}
              exitDurationMs={enterDurationMs(top!.item.transition)}
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
      {phase === 'hold' && (
        <HoldScreen
          feature={feature}
          group={groupById(feature.holdSlideGroupId)}
          dir={dir!}
          music={music}
          rollAt={rollAt}
          paused={paused}
          onRoll={startMovie}
        />
      )}
      {phase === 'intro' && <FeatureIntro feature={feature} dir={dir!} onDone={rollMovie} />}
      {phase === 'movie' && (
        <MovieStage
          ref={movieRef}
          filePath={feature.filePath}
          subtitlePath={feature.subtitlePath}
          startAtSec={resumeAtSec ?? 0}
          paused={paused}
          subtitlesOn={subtitlesOn}
          onSubtitlesAvailable={setHasSubtitles}
          onEnded={showEndCard}
          onFailed={movieFailed}
        />
      )}
      {phase === 'handoff' && (
        <HandoffScreen to={handoff.to} note={handoff.note} error={handoff.error} />
      )}
      {phase === 'ended' && (
        <EndCard feature={feature} group={groupById(feature.endSlideGroupId)} dir={dir!} />
      )}
      <PopupVideoOverlay ref={popupVideoRef} dir={dir!} paused={paused} />
      {phase === 'preshow' && hasShowtime && (
        <CountdownOverlay config={countdown} getShowtime={getShowtime} />
      )}
      {ending && <div className="show-fade-black" />}
      <ShowHud paused={paused && phase !== 'hold'} message={message} />
    </div>
  )
}
