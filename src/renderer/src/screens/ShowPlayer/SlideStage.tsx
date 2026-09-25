import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import type { SlideItem } from '@shared/types'
import { mediaFileUrl } from '@shared/paths'
import { useCountdownTimer } from '../../hooks/useCountdownTimer'
import type { BackgroundMusicController } from '../../hooks/useBackgroundMusic'

export default function SlideStage({
  item,
  dir,
  paused,
  music,
  onDone
}: {
  item: SlideItem
  dir: string
  paused: boolean
  music: BackgroundMusicController
  onDone: () => void
}): React.JSX.Element {
  useCountdownTimer(item.durationSec, paused, onDone)

  useEffect(() => {
    if (item.music) {
      music.playTrack(item.music.fileName, item.music.volume, item.music.fadeInSec)
    }
    return () => {
      if (item.music && !item.music.continueToNext) {
        music.fadeOutAndStop(item.music.fadeOutSec)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  const bgImageUrl = item.backgroundImage ? mediaFileUrl(dir, 'image', item.backgroundImage) : null
  const kenBurnsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!bgImageUrl || !kenBurnsRef.current) return
    const tween = gsap.fromTo(
      kenBurnsRef.current,
      { scale: 1 },
      { scale: 1.12, duration: Math.max(item.durationSec, 4), ease: 'none' }
    )
    return () => {
      tween.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgImageUrl])

  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const title = titleRef.current
    const subtitle = subtitleRef.current

    if (item.textAnimation === 'typewriter' && title) {
      const text = item.title
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
    if (item.textAnimation === 'fade-up') fromVars.y = 24
    if (item.textAnimation === 'slide-in') fromVars.x = -40
    if (item.textAnimation === 'zoom-in') fromVars.scale = 0.85

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
  }, [item.id, item.textAnimation])

  return (
    <div className={`stage slide-stage slide-theme-${item.theme}`}>
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
          {item.title}
        </h1>
        {item.subtitle && (
          <p ref={subtitleRef} className="slide-subtitle">
            {item.subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
