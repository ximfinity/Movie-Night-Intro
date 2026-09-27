import { useEffect, useRef } from 'react'

/** Calls onDone once after durationSec of un-paused time. Uses a single timeout rather than
 * a per-frame loop, so a slide on screen doesn't re-render 60 times a second (which matters
 * with a pop-up video playing, and in the editor's live preview). */
export function useFrameTimer(durationSec: number, paused: boolean, onDone: () => void): void {
  const remainingMsRef = useRef(durationSec * 1000)
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    if (paused || doneRef.current) return
    const startedAt = performance.now()
    const id = window.setTimeout(() => {
      doneRef.current = true
      onDoneRef.current()
    }, remainingMsRef.current)
    return () => {
      window.clearTimeout(id)
      if (!doneRef.current) {
        remainingMsRef.current = Math.max(
          0,
          remainingMsRef.current - (performance.now() - startedAt)
        )
      }
    }
  }, [paused])
}
