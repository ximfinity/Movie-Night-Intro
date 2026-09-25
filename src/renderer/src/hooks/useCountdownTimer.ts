import { useEffect, useRef, useState } from 'react'

/** Frame-driven countdown that can be paused, counting down from durationSec to 0. */
export function useCountdownTimer(
  durationSec: number,
  paused: boolean,
  onComplete: () => void
): number {
  const [remaining, setRemaining] = useState(durationSec)
  const remainingRef = useRef(durationSec)
  const lastTsRef = useRef<number | null>(null)
  const doneRef = useRef(false)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  useEffect(() => {
    let raf = 0
    const tick = (ts: number): void => {
      if (lastTsRef.current === null) lastTsRef.current = ts
      const dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts
      if (!paused && !doneRef.current) {
        remainingRef.current = Math.max(0, remainingRef.current - dt)
        setRemaining(remainingRef.current)
        if (remainingRef.current <= 0) {
          doneRef.current = true
          onCompleteRef.current()
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [paused])

  return remaining
}
