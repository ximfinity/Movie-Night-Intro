import { useEffect, useRef, useState } from 'react'

/** Smallest change in remaining seconds worth re-rendering for (the ring animates between
 * updates with a CSS transition, and the digits only change once a second). */
const REPORT_STEP_SEC = 0.1

/** Frame-driven countdown that can be paused, counting down from durationSec to 0. */
export function useCountdownTimer(
  durationSec: number,
  paused: boolean,
  onComplete: () => void
): number {
  const [remaining, setRemaining] = useState(durationSec)
  const remainingRef = useRef(durationSec)
  const reportedRef = useRef(durationSec)
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
        if (
          remainingRef.current === 0 ||
          reportedRef.current - remainingRef.current >= REPORT_STEP_SEC
        ) {
          reportedRef.current = remainingRef.current
          setRemaining(remainingRef.current)
        }
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
