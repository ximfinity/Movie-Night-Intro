import type { CountdownConfig } from './types'

const HOUR_MS = 60 * 60 * 1000

/** Formats a Date as local 24-hour "HH:mm", the form used by <input type="time"> and
 * stored in CountdownConfig.targetTime. */
export function formatTimeOfDay(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** Resolves a "HH:mm" local time of day to the epoch ms of its next sensible occurrence
 * relative to `now`: today, unless today's occurrence is more than 12 hours in the past, in
 * which case it's tomorrow's (so setting 00:30 at 23:30 counts down 1 hour instead of
 * reading as long finished). Times up to 12 hours ago still resolve to today, so a show
 * that's running late reads as complete rather than jumping to tomorrow. */
export function targetTimeToEpoch(hhmm: string, now: number = Date.now()): number {
  const [hours, minutes] = hhmm.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return now
  const target = new Date(now)
  target.setHours(hours, minutes, 0, 0)
  if (target.getTime() < now - 12 * HOUR_MS) target.setDate(target.getDate() + 1)
  return target.getTime()
}

/** Show-run state the countdown target depends on, beyond the saved settings. */
export interface ShowClock {
  /** When the show was started (epoch ms): the 'duration' countdown runs from here. */
  startedAt: number
  /** Total time spent paused so far; pausing holds a 'duration' countdown still. */
  pausedTotalMs: number
  /** When the current pause began, or null while running. */
  pausedSince: number | null
  /** Adjustment made during the show (the phone remote's +5 / −5 min, "start in N
   * min"); applies to both modes. Never saved to the project. */
  offsetMs: number
}

export function createShowClock(now: number, offsetMs = 0): ShowClock {
  return { startedAt: now, pausedTotalMs: 0, pausedSince: null, offsetMs }
}

/** Epoch ms at which showtime arrives, as things stand at `now`. */
export function showtimeEpoch(config: CountdownConfig, clock: ShowClock, now: number): number {
  if (config.mode === 'clock') return targetTimeToEpoch(config.targetTime, now) + clock.offsetMs
  const pausedMs = clock.pausedTotalMs + (clock.pausedSince !== null ? now - clock.pausedSince : 0)
  return clock.startedAt + config.durationSec * 1000 + pausedMs + clock.offsetMs
}

/** Offset that moves showtime to exactly `minutes` from `now`. */
export function offsetForStartIn(
  config: CountdownConfig,
  clock: ShowClock,
  now: number,
  minutes: number
): number {
  const withoutOffset = showtimeEpoch(config, { ...clock, offsetMs: 0 }, now)
  return now + minutes * 60_000 - withoutOffset
}

/** Whether the playlist should start over from the top when it reaches its end at `now`,
 * given when showtime currently falls. */
export function shouldLoopUntil(config: CountdownConfig, showtime: number, now: number): boolean {
  if (!config.enabled || config.mode !== 'clock' || !config.loopPlaylistUntilShowtime) return false
  return showtime > now
}

/** When the hold ("starting shortly") screen should roll the movie by itself, or null to
 * wait for the go button. The hold lasts `holdSec`, counted from showtime if the hold
 * screen came up early (the playlist ran out first), so the movie never starts before the
 * advertised time. */
export function holdRollAt(
  startMode: 'auto' | 'manual',
  holdSec: number,
  holdEnteredAt: number,
  showtime: number | null
): number | null {
  if (startMode !== 'auto') return null
  return Math.max(holdEnteredAt, showtime ?? 0) + holdSec * 1000
}

/** "1:02:03" / "4:05" for a number of seconds. */
export function formatTimecode(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}
