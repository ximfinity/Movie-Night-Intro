import { useEffect, useMemo, useRef } from 'react'
import type { VideoItem } from '@shared/types'
import { mediaFileUrl } from '@shared/paths'

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
    el.volume = item.volume
    el.play().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (paused) el.pause()
    else el.play().catch(() => {})
  }, [paused])

  return (
    <div className="stage video-stage">
      <video ref={videoRef} src={src} onEnded={onDone} />
    </div>
  )
}
