import { useEffect, useMemo, useRef } from 'react'
import type { VideoItem } from '@shared/types'
import { mediaFileUrl } from '@shared/paths'
import { ScaledVolume } from '../../lib/showVolume'

export default function VideoStage({
  item,
  dir,
  paused,
  stopBackgroundAudio,
  onDone
}: {
  item: VideoItem
  dir: string
  paused: boolean
  stopBackgroundAudio: () => void
  onDone: () => void
}): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const src = useMemo(() => mediaFileUrl(dir, 'video', item.fileName), [dir, item.fileName])

  useEffect(() => {
    stopBackgroundAudio()
    const el = videoRef.current
    if (!el) return
    const volume = new ScaledVolume(el, Math.min(1, Math.max(0, item.volume ?? 1)))
    el.play().catch((err) => console.warn('Video failed to start:', item.fileName, err))
    return () => volume.dispose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (paused) el.pause()
    else el.play().catch(() => {})
  }, [paused])

  function handleError(): void {
    // Missing file or a format/codec Chromium can't decode: skip it rather than sitting on
    // a black screen forever waiting for an `ended` event that will never come.
    console.warn('Video could not be played, skipping:', item.fileName, videoRef.current?.error)
    onDone()
  }

  return (
    <div className="stage video-stage">
      <video ref={videoRef} src={src} onEnded={onDone} onError={handleError} />
    </div>
  )
}
