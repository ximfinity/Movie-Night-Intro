import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import gsap from 'gsap'
import type { OverlayPosition } from '@shared/types'
import { mediaFileUrl } from '@shared/paths'

/** Base size (px) the pop-up video's sizeScale multiplies. */
export const POPUP_VIDEO_BASE_WIDTH = 260
export const POPUP_VIDEO_BASE_HEIGHT = 170

export interface PopupVideoHandle {
  /** Starts (or takes over) the pop-up video and returns an ownership token; only the
   * current owner's fadeOutAndStop has any effect. */
  play: (
    fileName: string,
    opts: {
      volume: number
      fadeInSec: number
      position: OverlayPosition
      sizeScale: number
      /** Called once when this clip finishes playing on its own, or fails to play (not on
       * a manual stop). */
      onEnded?: () => void
    }
  ) => number
  fadeOutAndStop: (token: number, fadeOutSec: number) => void
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
  const ownerRef = useRef(0)
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<OverlayPosition>('bottom-left')
  const [sizeScale, setSizeScale] = useState(3)

  useImperativeHandle(
    ref,
    () => ({
      play(fileName, opts) {
        const token = ++ownerRef.current
        const el = videoRef.current
        if (!el) return token
        setPosition(opts.position)
        setSizeScale(opts.sizeScale)
        onEndedRef.current = opts.onEnded
        if (currentFileRef.current === fileName && !el.paused) {
          gsap.to(el, { volume: opts.volume, duration: 0.4, overwrite: true })
          return token
        }
        gsap.killTweensOf(el)
        currentFileRef.current = fileName
        el.src = mediaFileUrl(dir, 'video', fileName)
        el.volume = 0
        el.currentTime = 0
        setVisible(true)
        el.play().catch((err) => console.warn('Pop-up video failed to play:', fileName, err))
        gsap.to(el, {
          volume: opts.volume,
          duration: Math.max(0.05, opts.fadeInSec),
          ease: 'linear'
        })
        return token
      },
      fadeOutAndStop(token, fadeOutSec) {
        const el = videoRef.current
        if (!el || token !== ownerRef.current) return
        gsap.to(el, {
          volume: 0,
          duration: Math.max(0.05, fadeOutSec),
          ease: 'linear',
          overwrite: true,
          onComplete: () => {
            if (token === ownerRef.current) {
              el.pause()
              setVisible(false)
              currentFileRef.current = null
            }
          }
        })
      },
      stopImmediately() {
        ownerRef.current++
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

  function handleFailed(): void {
    // A clip that can't be decoded would otherwise leave a black box on screen and, with
    // "repeat slides until the video ends", keep the slides looping forever.
    console.warn('Pop-up video could not be played:', currentFileRef.current)
    setVisible(false)
    currentFileRef.current = null
    onEndedRef.current?.()
  }

  return (
    <div
      className={`popup-video popup-video-${position} ${visible ? '' : 'popup-video-hidden'}`}
      style={{
        width: POPUP_VIDEO_BASE_WIDTH * sizeScale,
        height: POPUP_VIDEO_BASE_HEIGHT * sizeScale
      }}
    >
      <video ref={videoRef} onEnded={() => onEndedRef.current?.()} onError={handleFailed} />
    </div>
  )
}
