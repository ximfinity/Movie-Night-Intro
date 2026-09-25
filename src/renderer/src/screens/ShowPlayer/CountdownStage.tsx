import { useState } from 'react'
import type { CountdownItem } from '@shared/types'
import { useCountdownTimer } from '../../hooks/useCountdownTimer'

function formatClock(totalSeconds: number): { minutes: string; seconds: string } {
  const s = Math.max(0, Math.ceil(totalSeconds))
  return {
    minutes: String(Math.floor(s / 60)).padStart(2, '0'),
    seconds: String(s % 60).padStart(2, '0')
  }
}

export default function CountdownStage({
  item,
  paused,
  onDone
}: {
  item: CountdownItem
  paused: boolean
  onDone: () => void
}): React.JSX.Element {
  const [phase, setPhase] = useState<'counting' | 'complete'>('counting')

  const remaining = useCountdownTimer(item.durationSec, paused || phase !== 'counting', () =>
    setPhase('complete')
  )
  useCountdownTimer(item.holdAtZeroSec, paused || phase !== 'complete', onDone)

  const { minutes, seconds } = formatClock(remaining)
  const progress = item.durationSec > 0 ? 1 - remaining / item.durationSec : 1
  const wholeSecond = Math.ceil(remaining)

  return (
    <div className={`stage countdown-stage countdown-style-${item.style}`}>
      {phase === 'counting' ? (
        <>
          <div className="countdown-label">{item.label}</div>
          <div className="countdown-display">
            {item.style === 'ring' && <CountdownRing progress={progress} />}
            <div key={wholeSecond} className="countdown-digits">
              {minutes !== '00' && <span className="countdown-unit">{minutes}</span>}
              {minutes !== '00' && <span className="countdown-colon">:</span>}
              <span className="countdown-unit">{seconds}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="countdown-complete">{item.completeLabel}</div>
      )}
    </div>
  )
}

function CountdownRing({ progress }: { progress: number }): React.JSX.Element {
  const radius = 140
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)
  return (
    <svg className="countdown-ring" width={320} height={320} viewBox="0 0 320 320">
      <circle
        className="countdown-ring-track"
        cx={160}
        cy={160}
        r={radius}
        strokeWidth={10}
        fill="none"
      />
      <circle
        className="countdown-ring-progress"
        cx={160}
        cy={160}
        r={radius}
        strokeWidth={10}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 160 160)"
      />
    </svg>
  )
}
