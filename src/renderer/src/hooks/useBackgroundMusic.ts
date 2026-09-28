import { useEffect, useMemo, useRef } from 'react'
import { mediaFileUrl } from '@shared/paths'
import { ScaledVolume } from '../lib/showVolume'

export interface BackgroundMusicController {
  /** Starts (or takes over, if the same track is already playing) the background track and
   * returns an ownership token. Only the current owner's fadeOutAndStop has any effect.
   * `loop` repeats the track until it's stopped (the hold screen's music). */
  playTrack: (fileName: string, targetVolume: number, fadeInSec: number, loop?: boolean) => number
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
  const audioRef = useRef<{ el: HTMLAudioElement; volume: ScaledVolume } | null>(null)
  const currentFileRef = useRef<string | null>(null)
  const ownerRef = useRef(0)

  useEffect(
    () => () => {
      audioRef.current?.el.pause()
      audioRef.current?.volume.dispose()
      audioRef.current = null
    },
    []
  )

  return useMemo<BackgroundMusicController>(() => {
    function ensureAudio(): { el: HTMLAudioElement; volume: ScaledVolume } {
      if (!audioRef.current) {
        const el = new Audio()
        audioRef.current = { el, volume: new ScaledVolume(el) }
      }
      return audioRef.current
    }

    return {
      playTrack(fileName, targetVolume, fadeInSec, loop = false) {
        const token = ++ownerRef.current
        const { el, volume } = ensureAudio()
        el.loop = loop
        if (currentFileRef.current === fileName && !el.paused) {
          volume.stopFades()
          volume.fadeTo(targetVolume, 0.4)
          return token
        }
        volume.set(0)
        currentFileRef.current = fileName
        el.src = mediaFileUrl(dir, 'audio', fileName)
        el.currentTime = 0
        el.play().catch((err) => console.warn('Background music failed to play:', fileName, err))
        volume.fadeTo(targetVolume, fadeInSec)
        return token
      },
      fadeOutAndStop(token, fadeOutSec) {
        const audio = audioRef.current
        if (!audio || token !== ownerRef.current) return
        audio.volume.fadeTo(0, fadeOutSec, {
          overwrite: true,
          onComplete: () => {
            if (token === ownerRef.current) {
              audio.el.pause()
              currentFileRef.current = null
            }
          }
        })
      },
      stopImmediately() {
        ownerRef.current++
        const audio = audioRef.current
        if (audio) {
          audio.volume.stopFades()
          audio.el.pause()
        }
        currentFileRef.current = null
      }
    }
  }, [dir])
}
