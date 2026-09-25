import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import gsap from 'gsap'
import type { OverlayPosition } from '@shared/types'
import { mediaFileUrl } from '@shared/paths'

/** Base size (px) the pop-up video's sizeScale multiplies. */
export const POPUP_VIDEO_BASE_WIDTH = 260
export const POPUP_VIDEO_BASE_HEIGHT = 170

export interface PopupVideoHandle {
  play: (
    fileName: string,
    opts: {
      volume: number
      fadeInSec: number
      position: OverlayPosition
      sizeScale: number
      /** Called once when this clip finishes playing on its own (not on a manual stop). */
      onEnded?: () => void
    }
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
  const onEndedRef = useRef<(() => void) | undefined>(undefined)
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<OverlayPosition>('bottom-left')
  const [sizeScale, setSizeScale] = useState(3)

  useImperativeHandle(
    ref,
    () => ({
      play(fileName, opts) {
        const el = videoRef.current
        if (!el) return
        setPosition(opts.position)
        setSizeScale(opts.sizeScale)
        onEndedRef.current = opts.onEnded
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
        onEndedRef.current = undefined
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
    <div
      className={`popup-video popup-video-${position} ${visible ? '' : 'popup-video-hidden'}`}
      style={{
        width: POPUP_VIDEO_BASE_WIDTH * sizeScale,
        height: POPUP_VIDEO_BASE_HEIGHT * sizeScale
      }}
    >
      <video ref={videoRef} onEnded={() => onEndedRef.current?.()} />
    </div>
  )
}
