import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { SlideFrame } from '@shared/types'
import { mediaFileUrl } from '@shared/paths'
import { useCountdownTimer } from '../../hooks/useCountdownTimer'

function pickSubtitle(options: string[]): string {
  const nonEmpty = options.filter((s) => s.trim().length > 0)
  if (nonEmpty.length === 0) return ''
  return nonEmpty[Math.floor(Math.random() * nonEmpty.length)]
}

/** Renders a single slideshow frame (text-on-background, or a full-bleed image) for its
 * own duration, then calls onDone. Music is handled one level up by SlideshowStage, since
 * it spans the whole rotation rather than any one frame. */
export default function SlideFrameView({
  frame,
  dir,
  paused,
  onDone
}: {
  frame: SlideFrame
  dir: string
  paused: boolean
  onDone: () => void
}): React.JSX.Element {
  useCountdownTimer(frame.durationSec, paused, onDone)

  // Picked once per mount (i.e. fresh each time this frame is actually shown — including
  // on a restart or manual re-visit — but stable for as long as it stays on screen).
  const [subtitle] = useState(() => pickSubtitle(frame.subtitleOptions))

  const bgImageUrl = frame.backgroundImage
    ? mediaFileUrl(dir, 'image', frame.backgroundImage)
    : null
  const kenBurnsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!bgImageUrl || !kenBurnsRef.current) return
    const tween = gsap.fromTo(
      kenBurnsRef.current,
      { scale: 1 },
      { scale: 1.12, duration: Math.max(frame.durationSec, 4), ease: 'none' }
    )
    return () => {
      tween.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgImageUrl])

  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (frame.content !== 'text') return undefined
    const title = titleRef.current
    const subtitle = subtitleRef.current

    if (frame.textAnimation === 'typewriter' && title) {
      const text = frame.title
      title.textContent = ''
      let i = 0
      const id = setInterval(() => {
        i += 1
        title.textContent = text.slice(0, i)
        if (i >= text.length) clearInterval(id)
      }, 45)
      if (subtitle) {
        gsap.fromTo(
          subtitle,
          { opacity: 0 },
          { opacity: 1, duration: 0.6, delay: Math.min(2, text.length * 0.045) }
        )
      }
      return () => clearInterval(id)
    }

    const targets = [title, subtitle].filter((n): n is HTMLHeadingElement | HTMLParagraphElement =>
      Boolean(n)
    )
    if (targets.length === 0) return undefined

    const fromVars: gsap.TweenVars = { opacity: 0 }
    if (frame.textAnimation === 'fade-up') fromVars.y = 24
    if (frame.textAnimation === 'slide-in') fromVars.x = -40
    if (frame.textAnimation === 'zoom-in') fromVars.scale = 0.85

    const tween = gsap.fromTo(targets, fromVars, {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      duration: 0.7,
      stagger: 0.12,
      ease: 'power3.out',
      delay: 0.15
    })
    return () => {
      tween.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame.id, frame.content, frame.textAnimation])

  if (frame.content === 'image') {
    return (
      <div className="stage slide-frame-image-only">
        {bgImageUrl && (
          <div
            ref={kenBurnsRef}
            className="slide-bg-image"
            style={{ backgroundImage: `url(${bgImageUrl})` }}
          />
        )}
      </div>
    )
  }

  return (
    <div className={`stage slide-stage slide-theme-${frame.theme}`}>
      {bgImageUrl && (
        <div className="slide-bg-image-wrap">
          <div
            ref={kenBurnsRef}
            className="slide-bg-image"
            style={{ backgroundImage: `url(${bgImageUrl})` }}
          />
          <div className="slide-bg-scrim" />
        </div>
      )}
      <div className="slide-content">
        <h1 ref={titleRef} className="slide-title">
          {frame.title}
        </h1>
        {subtitle && (
          <p ref={subtitleRef} className="slide-subtitle">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
