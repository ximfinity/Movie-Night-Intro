import { useMemo, useRef, useState } from 'react'
import type { SlideshowItem } from '@shared/types'
import type { BackgroundMusicController } from '../../hooks/useBackgroundMusic'
import type { PopupVideoHandle } from './PopupVideoOverlay'
import SlideshowStage from './SlideshowStage'

const SILENT: BackgroundMusicController = {
  playTrack: () => 0,
  fadeOutAndStop: () => {},
  stopImmediately: () => {}
}

/** A slide group rotating endlessly behind the hold screen or thanks card. Its own music
 * is left out: those screens have their own. */
export default function LoopingGroup({
  item,
  dir,
  paused
}: {
  item: SlideshowItem
  dir: string
  paused: boolean
}): React.JSX.Element {
  const [pass, setPass] = useState(0)
  const silent = useMemo(() => ({ ...item, music: null }), [item])
  const noPopup = useRef<PopupVideoHandle>(null)
  return (
    <SlideshowStage
      key={pass}
      item={silent}
      dir={dir}
      paused={paused}
      music={SILENT}
      popupVideoRef={noPopup}
      onDone={() => setPass((p) => p + 1)}
    />
  )
}
