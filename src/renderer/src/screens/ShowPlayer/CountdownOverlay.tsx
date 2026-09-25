import { useState } from 'react'
import type { CountdownConfig } from '@shared/types'
import { useCountdownTimer } from '../../hooks/useCountdownTimer'

function formatClock(totalSeconds: number): { minutes: string; seconds: string } {
  const s = Math.max(0, Math.ceil(totalSeconds))
  return {
    minutes: String(Math.floor(s / 60)).padStart(2, '0'),
    seconds: String(s % 60).padStart(2, '0')
  }
}

/** Persistent countdown-to-showtime widget, layered on top of whatever playlist item is
 * currently playing. Runs from the moment the show starts until it completes, independent
 * of which video/slide is on screen, then fades itself out for the rest of the show. */
export default function CountdownOverlay({
  config,
  paused
}: {
  config: CountdownConfig
  paused: boolean
}): React.JSX.Element | null {
  const [phase, setPhase] = useState<'counting' | 'complete' | 'hidden'>('counting')

  const remaining = useCountdownTimer(config.durationSec, paused || phase !== 'counting', () =>
    setPhase('complete')
  )
  useCountdownTimer(config.holdAtZeroSec, paused || phase !== 'complete', () => setPhase('hidden'))

  if (!config.enabled || phase === 'hidden') return null

  const { minutes, seconds } = formatClock(remaining)
  const progress = config.durationSec > 0 ? 1 - remaining / config.durationSec : 1
  const wholeSecond = Math.ceil(remaining)

  return (
    <div
      className={`countdown-overlay countdown-overlay-${config.position} countdown-style-${config.style}`}
    >
      {phase === 'counting' ? (
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
