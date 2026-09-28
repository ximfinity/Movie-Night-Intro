import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { toFileUrl } from '@shared/paths'
import { toWebVtt } from '@shared/subtitles'
import { ScaledVolume } from '../../lib/showVolume'

export interface MovieHandle {
  seek: (deltaSec: number) => void
  status: () => { positionSec: number; durationSec: number; paused: boolean }
}

function showSubtitles(video: HTMLVideoElement | null, on: boolean): void {
  const track = video?.textTracks[0]
  if (track) track.mode = on ? 'showing' : 'hidden'
}

/** How often the playing position is saved, so a crash or power cut can resume nearby. */
const RESUME_SAVE_MS = 5000

/** The feature film in the built-in player: the linked file, optional subtitles, and a
 * resume point saved as it plays. Calls onFailed if the file can't be decoded (so the show
 * can hand it to the PC's own player instead). */
export default function MovieStage({
  filePath,
  subtitlePath,
  startAtSec,
  paused,
  subtitlesOn,
  onSubtitlesAvailable,
  onEnded,
  onFailed,
  ref
}: {
  filePath: string
  subtitlePath: string
  startAtSec: number
  paused: boolean
  subtitlesOn: boolean
  onSubtitlesAvailable: (available: boolean) => void
  onEnded: () => void
  onFailed: (message: string) => void
  ref: React.Ref<MovieHandle>
}): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [trackUrl, setTrackUrl] = useState<string | null>(null)

  useImperativeHandle(ref, () => ({
    seek(deltaSec) {
      const el = videoRef.current
      if (!el) return
      el.currentTime = Math.min(
        Math.max(0, el.currentTime + deltaSec),
        Number.isFinite(el.duration) ? el.duration : el.currentTime + deltaSec
      )
    },
    status() {
      const el = videoRef.current
      return {
        positionSec: el?.currentTime ?? 0,
        durationSec: el && Number.isFinite(el.duration) ? el.duration : 0,
        paused: el?.paused ?? true
      }
    }
  }))

  useEffect(() => {
    const volume = new ScaledVolume(videoRef.current!, 1)
    return () => volume.dispose()
  }, [])

  useEffect(() => {
    if (!subtitlePath) {
      onSubtitlesAvailable(false)
      return
    }
    let url: string | null = null
    let cancelled = false
    window.api
      .readSubtitles(subtitlePath)
      .then((text) => {
        if (cancelled) return
        url = URL.createObjectURL(new Blob([toWebVtt(text)], { type: 'text/vtt' }))
        setTrackUrl(url)
        onSubtitlesAvailable(true)
      })
      .catch((err) => {
        console.warn('Subtitles could not be loaded:', err)
        onSubtitlesAvailable(false)
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtitlePath])

  useEffect(() => {
    showSubtitles(videoRef.current, subtitlesOn)
  }, [subtitlesOn, trackUrl])

  useEffect(() => {
    const el = videoRef.current
    if (!el || el.readyState === 0) return
    if (paused) el.pause()
    else el.play().catch(() => {})
  }, [paused])

  useEffect(() => {
    const id = setInterval(() => {
      const el = videoRef.current
      if (!el || el.paused || el.currentTime < 1) return
      window.api
        .saveResumePoint(filePath, el.currentTime, Number.isFinite(el.duration) ? el.duration : 0)
        .catch(() => {})
    }, RESUME_SAVE_MS)
    return () => clearInterval(id)
  }, [filePath])

  function handleLoaded(): void {
    const el = videoRef.current!
    if (startAtSec > 0) el.currentTime = startAtSec
    if (!paused) {
      el.play().catch((err) => console.warn('Movie failed to start:', err))
    }
  }

  function handleEnded(): void {
    window.api.clearResumePoint().catch(() => {})
    onEnded()
  }

  function handleError(): void {
    const err = videoRef.current?.error
    onFailed(err?.message || `Media error ${err?.code ?? ''}`.trim())
  }

  return (
    <div className="stage video-stage movie-stage">
      <video
        ref={videoRef}
        src={toFileUrl(filePath)}
        onLoadedMetadata={handleLoaded}
        onEnded={handleEnded}
        onError={handleError}
      >
        {trackUrl && (
          <track
            kind="subtitles"
            src={trackUrl}
            srcLang="en"
            label="Subtitles"
            default={subtitlesOn}
          />
        )}
      </video>
    </div>
  )
}
