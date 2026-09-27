import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { SlideFrame } from '@shared/types'
import { cssUrl, mediaFileUrl } from '@shared/paths'
import { RANDOM_THEME, SLIDE_THEMES, findSlideTheme } from '@shared/slideThemes'
import { createShuffleBag } from '@shared/shuffleBag'
import { useFrameTimer } from '../../hooks/useFrameTimer'

// Separate bags for the show and the editor preview, so previewing doesn't use up the
// show's rotation.
const showSubtitleBag = createShuffleBag()
const showThemeBag = createShuffleBag()
const previewSubtitleBag = createShuffleBag()
const previewThemeBag = createShuffleBag()

function pickSubtitle(frame: SlideFrame, preview: boolean): string {
  const options = frame.subtitleOptions.filter((s) => s.trim().length > 0)
  if (options.length === 0) return ''
  const bag = preview ? previewSubtitleBag : showSubtitleBag
  return options[bag(frame.id, options.length)]
}

function pickTheme(frame: SlideFrame, preview: boolean): (typeof SLIDE_THEMES)[number] {
  if (frame.theme !== RANDOM_THEME) return findSlideTheme(frame.theme)
  const bag = preview ? previewThemeBag : showThemeBag
  return SLIDE_THEMES[bag(frame.id, SLIDE_THEMES.length)]
}

/** Renders a single slideshow frame (text-on-background, or a full-bleed image) for its
 * own duration, then calls onDone. Music is handled one level up by SlideshowStage, since
 * it spans the whole rotation rather than any one frame. Sized with container units, so it
 * renders identically fullscreen and in the editor's small live preview. */
export default function SlideFrameView({
  frame,
  dir,
  paused,
  onDone,
  preview = false
}: {
  frame: SlideFrame
  dir: string
  paused: boolean
  onDone: () => void
  preview?: boolean
}): React.JSX.Element {
  useFrameTimer(frame.durationSec, paused, onDone)

  // Picked once per mount (i.e. fresh each time this frame is actually shown — including
  // on a restart or manual re-visit — but stable for as long as it stays on screen).
  const [subtitle] = useState(() => pickSubtitle(frame, preview))
  const [theme] = useState(() => pickTheme(frame, preview))
  const typewriter = frame.content === 'text' && frame.textAnimation === 'typewriter'
  const [typedChars, setTypedChars] = useState(typewriter ? 0 : Infinity)

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
    const subtitleEl = subtitleRef.current

    if (typewriter) {
      const length = frame.title.length
      const id = setInterval(() => {
        setTypedChars((n) => {
          if (n + 1 >= length) clearInterval(id)
          return n + 1
        })
      }, 45)
      if (subtitleEl) {
        gsap.fromTo(
          subtitleEl,
          { opacity: 0 },
          { opacity: 1, duration: 0.6, delay: Math.min(2, length * 0.045) }
        )
      }
      return () => clearInterval(id)
    }

    const targets = [title, subtitleEl].filter(
      (n): n is HTMLHeadingElement | HTMLParagraphElement => Boolean(n)
    )
    if (targets.length === 0) return undefined

    // Percent offsets so the motion scales with the slide (fullscreen or preview).
    const fromVars: gsap.TweenVars = { opacity: 0 }
    if (frame.textAnimation === 'fade-up') fromVars.yPercent = 30
    if (frame.textAnimation === 'slide-in') fromVars.xPercent = -8
    if (frame.textAnimation === 'zoom-in') fromVars.scale = 0.85

    const tween = gsap.fromTo(targets, fromVars, {
      opacity: 1,
      yPercent: 0,
      xPercent: 0,
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
            style={{ backgroundImage: cssUrl(bgImageUrl) }}
          />
        )}
      </div>
    )
  }

  return (
    <div
      className="stage slide-stage"
      style={{ background: theme.background, color: theme.textColor }}
    >
      {bgImageUrl && (
        <div className="slide-bg-image-wrap">
          <div
            ref={kenBurnsRef}
            className="slide-bg-image"
            style={{ backgroundImage: cssUrl(bgImageUrl) }}
          />
          <div className="slide-bg-scrim" />
        </div>
      )}
      <div className="slide-content">
        <h1
          ref={titleRef}
          className="slide-title"
          style={{
            backgroundImage: `linear-gradient(135deg, ${theme.titleFrom}, ${theme.titleTo})`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          {typewriter ? frame.title.slice(0, typedChars) : frame.title}
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
