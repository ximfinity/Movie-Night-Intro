import { useEffect, useState } from 'react'
import type { CountdownConfig } from '@shared/types'
import { targetTimeToEpoch } from '@shared/countdown'
import { useCountdownTimer } from '../../hooks/useCountdownTimer'

type Phase = 'counting' | 'complete' | 'hidden'

interface CountdownState {
  remaining: number
  phase: Phase
  totalSec: number
}

function formatClock(totalSeconds: number): { minutes: string; seconds: string } {
  const s = Math.max(0, Math.ceil(totalSeconds))
  return {
    minutes: String(Math.floor(s / 60)).padStart(2, '0'),
    seconds: String(s % 60).padStart(2, '0')
  }
}

/** Counts down a fixed length from the moment the overlay mounts (i.e. the show start) —
 * resets to the full duration every time the show is (re)started. */
function useDurationCountdown(config: CountdownConfig, paused: boolean): CountdownState {
  const [phase, setPhase] = useState<Phase>('counting')
  const remaining = useCountdownTimer(config.durationSec, paused || phase !== 'counting', () =>
    setPhase('complete')
  )
  useCountdownTimer(config.holdAtZeroSec, paused || phase !== 'complete', () => setPhase('hidden'))
  return { remaining, phase, totalSec: config.durationSec }
}

/** Counts down to an absolute time of day, computed from the wall clock rather than
 * elapsed-since-mount — stays correct no matter how many times the show is
 * stopped/restarted, and deliberately ignores `paused` since showtime doesn't pause. */
function useClockCountdown(config: CountdownConfig): CountdownState {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  const target = targetTimeToEpoch(config.targetTime)
  const [initialTotalSec] = useState(() => Math.max(1, (target - now) / 1000))

  const remaining = Math.max(0, (target - now) / 1000)
  const overrun = Math.max(0, (now - target) / 1000)
  const phase: Phase =
    now < target ? 'counting' : overrun < config.holdAtZeroSec ? 'complete' : 'hidden'

  return { remaining, phase, totalSec: initialTotalSec }
}

/** Persistent countdown-to-showtime widget, layered on top of whatever playlist item is
 * currently playing. Runs independently of which video/slide is on screen, then fades
 * itself out once complete. */
export default function CountdownOverlay({
  config,
  paused
}: {
  config: CountdownConfig
  paused: boolean
}): React.JSX.Element | null {
  const durationState = useDurationCountdown(config, paused)
  const clockState = useClockCountdown(config)
  const { remaining, phase, totalSec } = config.mode === 'clock' ? clockState : durationState

  if (!config.enabled || phase === 'hidden') return null

  const { minutes, seconds } = formatClock(remaining)
  const progress = totalSec > 0 ? 1 - remaining / totalSec : 1
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
