/** Formats a Date as local 24-hour "HH:mm", the form used by <input type="time"> and
 * stored in CountdownConfig.targetTime. */
export function formatTimeOfDay(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** Resolves a "HH:mm" local time of day to the epoch ms of that time on `from`'s date
 * (today by default). Always today's date — if the time has already passed today, the
 * countdown simply reads as complete rather than rolling over to tomorrow. */
export function targetTimeToEpoch(hhmm: string, from: Date = new Date()): number {
  const [hours, minutes] = hhmm.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return from.getTime()
  const target = new Date(from)
  target.setHours(hours, minutes, 0, 0)
  return target.getTime()
}
