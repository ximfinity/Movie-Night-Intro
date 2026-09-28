import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { FeatureConfig, SlideshowItem } from '@shared/types'
import { mediaFileUrl } from '@shared/paths'
import { formatTimecode } from '@shared/countdown'
import type { BackgroundMusicController } from '../../hooks/useBackgroundMusic'
import { ScaledVolume } from '../../lib/showVolume'
import logoUrl from '../../assets/logo.svg'
import LoopingGroup from './LoopingGroup'
import './featureScreens.css'

/** Red theater curtains around a spotlight: the backdrop when no slide group is chosen. */
export function CurtainBackdrop(): React.JSX.Element {
  return (
    <div className="curtain-backdrop" aria-hidden>
      <div className="curtain-spot" />
      <div className="curtain curtain-left" />
      <div className="curtain curtain-right" />
      <div className="curtain-valance" />
    </div>
  )
}

function Backdrop({
  group,
  dir,
  paused
}: {
  group: SlideshowItem | null
  dir: string
  paused: boolean
}): React.JSX.Element {
  if (!group) return <CurtainBackdrop />
  return (
    <div className="feature-backdrop">
      <LoopingGroup item={group} dir={dir} paused={paused} />
    </div>
  )
}

/** "The movie will be starting shortly": up from when the pre-show wraps up until the
 * movie rolls, by itself at `rollAt` (auto mode) or on the go button. */
export function HoldScreen({
  feature,
  group,
  dir,
  music,
  rollAt,
  paused,
  onRoll
}: {
  feature: FeatureConfig
  group: SlideshowItem | null
  dir: string
  music: BackgroundMusicController
  rollAt: number | null
  paused: boolean
  onRoll: () => void
}): React.JSX.Element {
  const [now, setNow] = useState(() => Date.now())
  const rolledRef = useRef(false)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (rollAt === null || paused || rolledRef.current || now < rollAt) return
    rolledRef.current = true
    onRoll()
  }, [now, rollAt, paused, onRoll])

  useEffect(() => {
    if (!feature.holdMusic) return
    const token = music.playTrack(feature.holdMusic, feature.holdMusicVolume, 2, true)
    return () => music.fadeOutAndStop(token, 1.5)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const posterUrl = feature.posterImage ? mediaFileUrl(dir, 'image', feature.posterImage) : null
  let status = ''
  if (paused) status = 'Paused'
  else if (rollAt !== null) {
    const left = (rollAt - now) / 1000
    status = left > 0 ? `Starting in ${formatTimecode(Math.ceil(left))}` : 'Starting…'
  }

  return (
    <div className="feature-screen">
      <Backdrop group={group} dir={dir} paused={paused} />
      <div className={`hold-panel ${group ? 'hold-panel-lower' : 'hold-panel-center'}`}>
        {posterUrl && <img className="hold-poster" src={posterUrl} alt="" />}
        <div className="hold-text">
          <div className="hold-message">{feature.holdMessage}</div>
          {feature.title && <div className="hold-title">{feature.title}</div>}
          {status && <div className="hold-status">{status}</div>}
        </div>
        <img className="hold-logo" src={logoUrl} alt="" />
      </div>
    </div>
  )
}

/** Between the hold screen and the movie: an animated "Our Feature Presentation" card, a
 * fade to black, or the user's own intro clip. */
export function FeatureIntro({
  feature,
  dir,
  onDone
}: {
  feature: FeatureConfig
  dir: string
  onDone: () => void
}): React.JSX.Element {
  const kind = feature.transition === 'clip' && !feature.introClip ? 'fade' : feature.transition
  const rootRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const doneRef = useRef(false)
  const finish = (): void => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }

  useEffect(() => {
    if (kind === 'fade') {
      const id = setTimeout(finish, 2500)
      return () => clearTimeout(id)
    }
    if (kind === 'clip') {
      const el = videoRef.current!
      const volume = new ScaledVolume(el, 1)
      el.play().catch(() => finish())
      return () => volume.dispose()
    }
    const root = rootRef.current!
    const q = gsap.utils.selector(root)
    const tl = gsap.timeline({ onComplete: finish })
    tl.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.8 })
      .to(q('.curtain-left'), { xPercent: -100, duration: 1.8, ease: 'power2.inOut' }, 1)
      .to(q('.curtain-right'), { xPercent: 100, duration: 1.8, ease: 'power2.inOut' }, 1)
      .fromTo(
        q('.bumper-kicker, .bumper-headline'),
        { opacity: 0, scale: 0.92 },
        { opacity: 1, scale: 1, duration: 1.2, stagger: 0.25, ease: 'power3.out' },
        1.8
      )
      .fromTo(q('.bumper-title'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.9 }, 2.8)
      .to(root, { opacity: 0, duration: 1.1 }, 6)
    return () => {
      tl.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (kind === 'clip') {
    return (
      <div className="stage video-stage feature-screen">
        <video
          ref={videoRef}
          src={mediaFileUrl(dir, 'video', feature.introClip!)}
          onEnded={finish}
          onError={finish}
        />
      </div>
    )
  }
  if (kind === 'fade') return <div className="feature-screen feature-black" />
  return (
    <div className="feature-screen bumper" ref={rootRef}>
      <div className="curtain-backdrop">
        <div className="curtain-spot" />
        <div className="bumper-text">
          <div className="bumper-kicker">Our</div>
          <div className="bumper-headline">Feature Presentation</div>
          {feature.title && <div className="bumper-title">{feature.title}</div>}
        </div>
        <div className="curtain curtain-left curtain-closed" />
        <div className="curtain curtain-right curtain-closed" />
        <div className="curtain-valance" />
      </div>
    </div>
  )
}

/** While the movie plays in a browser or the PC's video player: the app has stepped aside
 * (minimized), and shows this if someone brings it back. */
export function HandoffScreen({
  to,
  note,
  error
}: {
  to: 'player' | 'browser' | null
  note: string | null
  error: string | null
}): React.JSX.Element {
  return (
    <div className="feature-screen">
      <CurtainBackdrop />
      <div className="hold-panel hold-panel-center">
        <div className="hold-text">
          {error ? (
            <>
              <div className="hold-message">The movie couldn&apos;t be started</div>
              <div className="handoff-detail">{error}</div>
            </>
          ) : (
            <>
              <div className="hold-message">Enjoy the movie!</div>
              <div className="handoff-detail">
                {note ??
                  `It's playing in ${to === 'browser' ? 'your web browser' : 'your video player'}.`}
              </div>
            </>
          )}
          <div className="hold-status">Enter: thanks card · Esc: exit</div>
        </div>
        <img className="hold-logo" src={logoUrl} alt="" />
      </div>
    </div>
  )
}

/** "Thanks for coming!" after the movie, until the show is exited. */
export function EndCard({
  feature,
  group,
  dir
}: {
  feature: FeatureConfig
  group: SlideshowItem | null
  dir: string
}): React.JSX.Element {
  return (
    <div className="feature-screen end-card">
      <Backdrop group={group} dir={dir} paused={false} />
      <div className={`hold-panel ${group ? 'hold-panel-lower' : 'hold-panel-center'}`}>
        <div className="hold-text">
          <div className="hold-message end-message">{feature.endMessage}</div>
          {feature.title && <div className="hold-title">{feature.title}</div>}
        </div>
        <img className="hold-logo" src={logoUrl} alt="" />
      </div>
    </div>
  )
}
