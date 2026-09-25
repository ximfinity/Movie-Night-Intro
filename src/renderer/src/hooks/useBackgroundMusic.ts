import { useMemo, useRef } from 'react'
import gsap from 'gsap'
import { mediaFileUrl } from '@shared/paths'

export interface BackgroundMusicController {
  playTrack: (fileName: string, targetVolume: number, fadeInSec: number) => void
  fadeOutAndStop: (fadeOutSec: number) => void
  stopImmediately: () => void
}

/** A single persistent <audio> element shared across the whole show, so a track can keep
 * playing seamlessly as the visible slide changes underneath it. */
export function useBackgroundMusic(dir: string): BackgroundMusicController {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentFileRef = useRef<string | null>(null)

  return useMemo<BackgroundMusicController>(() => {
    function ensureAudio(): HTMLAudioElement {
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }
      return audioRef.current
    }

    return {
      playTrack(fileName, targetVolume, fadeInSec) {
        const el = ensureAudio()
        if (currentFileRef.current === fileName && !el.paused) {
          gsap.to(el, { volume: targetVolume, duration: 0.4, overwrite: true })
          return
        }
        gsap.killTweensOf(el)
        currentFileRef.current = fileName
        el.src = mediaFileUrl(dir, 'audio', fileName)
        el.volume = 0
        el.currentTime = 0
        el.play().catch(() => {})
        gsap.to(el, { volume: targetVolume, duration: Math.max(0.05, fadeInSec), ease: 'linear' })
      },
      fadeOutAndStop(fadeOutSec) {
        const el = audioRef.current
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
              currentFileRef.current = null
            }
          }
        })
      },
      stopImmediately() {
        const el = audioRef.current
        if (el) {
          gsap.killTweensOf(el)
          el.pause()
        }
        currentFileRef.current = null
      }
    }
  }, [dir])
}
