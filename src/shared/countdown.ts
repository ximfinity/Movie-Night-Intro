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

/** Whether the playlist should start over from the top when it reaches its end at `now`. */
export function shouldLoopPlaylist(config: CountdownConfig, now: number): boolean {
  if (!config.enabled || config.mode !== 'clock' || !config.loopPlaylistUntilShowtime) return false
  return targetTimeToEpoch(config.targetTime, now) > now
}
