import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import gsap from 'gsap'
import type { OverlayPosition } from '@shared/types'
import { mediaFileUrl } from '@shared/paths'

export interface PopupVideoHandle {
  play: (
    fileName: string,
    opts: { volume: number; fadeInSec: number; position: OverlayPosition }
  ) => void
  fadeOutAndStop: (fadeOutSec: number) => void
  stopImmediately: () => void
}

/** A small always-mounted corner video, played imperatively (like the audio background
 * music controller) so a single persistent <video> element can be reused across a whole
 * show rather than remounted per slideshow item. */
export default function PopupVideoOverlay({
  dir,
  paused,
  ref
}: {
  dir: string
  paused: boolean
  ref: React.Ref<PopupVideoHandle>
}): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const currentFileRef = useRef<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<OverlayPosition>('bottom-left')

  useImperativeHandle(
    ref,
    () => ({
      play(fileName, opts) {
        const el = videoRef.current
        if (!el) return
        setPosition(opts.position)
        if (currentFileRef.current === fileName && !el.paused) {
          gsap.to(el, { volume: opts.volume, duration: 0.4, overwrite: true })
          return
        }
        gsap.killTweensOf(el)
        currentFileRef.current = fileName
        el.src = mediaFileUrl(dir, 'video', fileName)
        el.volume = 0
        el.currentTime = 0
        setVisible(true)
        el.play().catch(() => {})
        gsap.to(el, {
          volume: opts.volume,
          duration: Math.max(0.05, opts.fadeInSec),
          ease: 'linear'
        })
      },
      fadeOutAndStop(fadeOutSec) {
        const el = videoRef.current
        if (!el) return
        const fileAtCallTime = currentFileRef.current
        gsap.killTweensOf(el)
        gsap.to(el, {
          volume: 0,
          duration: Math.max(0.05, fadeOutSec),
          ease: 'linear',
          overwrite: true,
          onComplete: () => {
            if (currentFileRef.current === fileAtCallTime) {
              el.pause()
              setVisible(false)
              currentFileRef.current = null
            }
          }
        })
      },
      stopImmediately() {
        const el = videoRef.current
        if (el) {
          gsap.killTweensOf(el)
          el.pause()
        }
        setVisible(false)
        currentFileRef.current = null
      }
    }),
    [dir]
  )

  useEffect(() => {
    const el = videoRef.current
    if (!el || !visible) return
    if (paused) el.pause()
    else el.play().catch(() => {})
  }, [paused, visible])

  return (
    <div className={`popup-video popup-video-${position} ${visible ? '' : 'popup-video-hidden'}`}>
      <video ref={videoRef} />
    </div>
  )
}
