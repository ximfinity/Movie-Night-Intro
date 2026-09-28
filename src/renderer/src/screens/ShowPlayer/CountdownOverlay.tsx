import { useEffect, useState } from 'react'
import type { CountdownConfig } from '@shared/types'

function formatClock(totalSeconds: number): { minutes: string; seconds: string } {
  const s = Math.max(0, Math.ceil(totalSeconds))
  return {
    minutes: String(Math.floor(s / 60)).padStart(2, '0'),
    seconds: String(s % 60).padStart(2, '0')
  }
}

/** Persistent countdown-to-showtime widget, layered on top of whatever playlist item is
 * currently playing. When showtime falls comes from the show player (`getShowtime`), which
 * accounts for the mode, pauses, and adjustments made from the phone remote; the overlay
 * just shows it, then its completion message, then fades itself out. */
export default function CountdownOverlay({
  config,
  getShowtime
}: {
  config: CountdownConfig
  getShowtime: (now: number) => number
}): React.JSX.Element | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [])
  const target = getShowtime(now)
  const remaining = Math.max(0, (target - now) / 1000)
  // The ring's full circle is the time left when the show started (or more, if showtime
  // was pushed back since).
  const [initialSec] = useState(() => Math.max(1, remaining))
  const totalSec = Math.max(initialSec, remaining)
  const overrun = (now - target) / 1000

  if (!config.enabled || overrun >= config.holdAtZeroSec) return null

  const { minutes, seconds } = formatClock(remaining)
  const progress = 1 - remaining / totalSec
  const wholeSecond = Math.ceil(remaining)

  return (
    <div
      className={`countdown-overlay countdown-overlay-${config.position} countdown-style-${config.style}`}
    >
      {remaining > 0 ? (
        <>
          <div className="countdown-overlay-label">{config.label}</div>
          <div className="countdown-overlay-display">
            {config.style === 'ring' && <CountdownRing progress={progress} />}
            <div key={wholeSecond} className="countdown-overlay-digits">
              {minutes !== '00' && <span className="countdown-overlay-unit">{minutes}</span>}
              {minutes !== '00' && <span className="countdown-overlay-colon">:</span>}
              <span className="countdown-overlay-unit">{seconds}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="countdown-overlay-complete">{config.completeLabel}</div>
      )}
    </div>
  )
}

function CountdownRing({ progress }: { progress: number }): React.JSX.Element {
  const radius = 46
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)
  return (
    <svg className="countdown-overlay-ring" width={112} height={112} viewBox="0 0 112 112">
      <circle
        className="countdown-overlay-ring-track"
        cx={56}
        cy={56}
        r={radius}
        strokeWidth={6}
        fill="none"
      />
      <circle
        className="countdown-overlay-ring-progress"
        cx={56}
        cy={56}
        r={radius}
        strokeWidth={6}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 56 56)"
      />
    </svg>
  )
}
