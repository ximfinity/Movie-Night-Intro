import { useMemo, useRef } from 'react'
import gsap from 'gsap'
import { mediaFileUrl } from '@shared/paths'

export interface BackgroundMusicController {
  /** Starts (or takes over, if the same track is already playing) the background track and
   * returns an ownership token. Only the current owner's fadeOutAndStop has any effect. */
  playTrack: (fileName: string, targetVolume: number, fadeInSec: number) => number
  fadeOutAndStop: (token: number, fadeOutSec: number) => void
  stopImmediately: () => void
}

/** A single persistent <audio> element shared across the whole show, so a track can keep
 * playing seamlessly as the visible slide changes underneath it.
 *
 * Ownership matters because playlist items overlap during transitions: the incoming
 * slideshow starts its music before the outgoing one unmounts, so the outgoing one's
 * fade-out must not touch music it no longer owns. */
export function useBackgroundMusic(dir: string): BackgroundMusicController {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentFileRef = useRef<string | null>(null)
  const ownerRef = useRef(0)

  return useMemo<BackgroundMusicController>(() => {
    function ensureAudio(): HTMLAudioElement {
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }
      return audioRef.current
    }

    return {
      playTrack(fileName, targetVolume, fadeInSec) {
        const token = ++ownerRef.current
        const el = ensureAudio()
        if (currentFileRef.current === fileName && !el.paused) {
          gsap.to(el, { volume: targetVolume, duration: 0.4, overwrite: true })
          return token
        }
        gsap.killTweensOf(el)
        currentFileRef.current = fileName
        el.src = mediaFileUrl(dir, 'audio', fileName)
        el.volume = 0
        el.currentTime = 0
        el.play().catch((err) => console.warn('Background music failed to play:', fileName, err))
        gsap.to(el, { volume: targetVolume, duration: Math.max(0.05, fadeInSec), ease: 'linear' })
        return token
      },
      fadeOutAndStop(token, fadeOutSec) {
        const el = audioRef.current
        if (!el || token !== ownerRef.current) return
        gsap.to(el, {
          volume: 0,
          duration: Math.max(0.05, fadeOutSec),
          ease: 'linear',
          overwrite: true,
          onComplete: () => {
            if (token === ownerRef.current) {
              el.pause()
              currentFileRef.current = null
            }
          }
        })
      },
      stopImmediately() {
        ownerRef.current++
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
