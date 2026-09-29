import { describe, expect, it } from 'vitest'
import {
  countdownActive,
  parseTimeOfDay,
  createShowClock,
  formatTimecode,
  holdRollAt,
  offsetForStartIn,
  shouldLoopUntil,
  showtimeEpoch,
  targetTimeToEpoch
} from './countdown'
import { createDefaultCountdown } from './factory'

const at = (h: number, m: number, s = 0): number => new Date(2026, 8, 26, h, m, s, 0).getTime()
const MIN = 60_000

describe('targetTimeToEpoch', () => {
  it('resolves to today when the time is later today', () => {
    expect(targetTimeToEpoch('20:00', at(19, 30))).toBe(at(20, 0))
  })

  it('stays today for a showtime that just passed (show running late)', () => {
    expect(targetTimeToEpoch('20:00', at(21, 15))).toBe(at(20, 0))
  })

  it('rolls over to tomorrow for a just-after-midnight showtime', () => {
    const target = targetTimeToEpoch('00:30', at(23, 30))
    expect(target - at(23, 30)).toBe(60 * MIN)
  })

  it('treats an unreadable or cleared time as now (never NaN)', () => {
    expect(targetTimeToEpoch('soon', at(12, 0))).toBe(at(12, 0))
    expect(targetTimeToEpoch('', at(12, 0))).toBe(at(12, 0))
    expect(targetTimeToEpoch('7:', at(12, 0))).toBe(at(12, 0))
    expect(targetTimeToEpoch('25:00', at(12, 0))).toBe(at(12, 0))
  })
})

describe('parseTimeOfDay / countdownActive', () => {
  it('reads real times only', () => {
    expect(parseTimeOfDay('07:05')).toEqual([7, 5])
    expect(parseTimeOfDay('7:05')).toEqual([7, 5])
    expect(parseTimeOfDay('')).toBeNull()
    expect(parseTimeOfDay('12:60')).toBeNull()
  })

  it('treats a clock countdown with no time as no countdown', () => {
    const base = createDefaultCountdown()
    expect(countdownActive({ ...base, mode: 'clock', targetTime: '20:00' })).toBe(true)
    expect(countdownActive({ ...base, mode: 'clock', targetTime: '' })).toBe(false)
    expect(countdownActive({ ...base, mode: 'duration', targetTime: '' })).toBe(true)
    expect(countdownActive({ ...base, enabled: false, targetTime: '20:00' })).toBe(false)
    expect(
      shouldLoopUntil(
        { ...base, mode: 'clock', targetTime: '', loopPlaylistUntilShowtime: true },
        NaN,
        0
      )
    ).toBe(false)
  })
})

describe('showtimeEpoch', () => {
  const clockMode = { ...createDefaultCountdown(), mode: 'clock' as const, targetTime: '20:00' }
  const durationMode = { ...createDefaultCountdown(), mode: 'duration' as const, durationSec: 600 }

  it('uses the target time, plus any adjustment, in clock mode', () => {
    const clock = createShowClock(at(19, 0))
    expect(showtimeEpoch(clockMode, clock, at(19, 10))).toBe(at(20, 0))
    expect(showtimeEpoch(clockMode, { ...clock, offsetMs: 5 * MIN }, at(19, 10))).toBe(at(20, 5))
  })

  it('counts from the show start in duration mode, holding still while paused', () => {
    const clock = createShowClock(at(19, 0))
    expect(showtimeEpoch(durationMode, clock, at(19, 1))).toBe(at(19, 10))
    const paused = { ...clock, pausedSince: at(19, 2) }
    expect(showtimeEpoch(durationMode, paused, at(19, 5))).toBe(at(19, 13))
    const resumed = { ...clock, pausedTotalMs: 3 * MIN }
    expect(showtimeEpoch(durationMode, resumed, at(19, 6))).toBe(at(19, 13))
  })

  it('computes the adjustment for "start in N minutes"', () => {
    const clock = createShowClock(at(19, 0))
    const offset = offsetForStartIn(clockMode, clock, at(19, 50), 2)
    expect(showtimeEpoch(clockMode, { ...clock, offsetMs: offset }, at(19, 50))).toBe(at(19, 52))
  })
})

describe('shouldLoopUntil', () => {
  const clock = {
    ...createDefaultCountdown(),
    mode: 'clock' as const,
    targetTime: '20:00',
    loopPlaylistUntilShowtime: true
  }

  it('loops before showtime and stops after it', () => {
    expect(shouldLoopUntil(clock, at(20, 0), at(19, 0))).toBe(true)
    expect(shouldLoopUntil(clock, at(20, 0), at(20, 1))).toBe(false)
  })

  it('only loops when enabled, in clock mode, with the countdown on', () => {
    expect(
      shouldLoopUntil({ ...clock, loopPlaylistUntilShowtime: false }, at(20, 0), at(19, 0))
    ).toBe(false)
    expect(shouldLoopUntil({ ...clock, mode: 'duration' }, at(20, 0), at(19, 0))).toBe(false)
    expect(shouldLoopUntil({ ...clock, enabled: false }, at(20, 0), at(19, 0))).toBe(false)
  })
})

describe('holdRollAt', () => {
  it('waits for the go button in manual mode', () => {
    expect(holdRollAt('manual', 30, at(20, 1), at(20, 0))).toBeNull()
  })

  it('rolls holdSec after the hold screen comes up at or after showtime', () => {
    expect(holdRollAt('auto', 30, at(20, 1), at(20, 0))).toBe(at(20, 1, 30))
  })

  it('never rolls before showtime when the playlist ran out early', () => {
    expect(holdRollAt('auto', 30, at(19, 50), at(20, 0))).toBe(at(20, 0, 30))
  })

  it('counts from the hold screen when there is no showtime', () => {
    expect(holdRollAt('auto', 10, at(19, 50), null)).toBe(at(19, 50, 10))
  })
})

describe('formatTimecode', () => {
  it('formats minutes and hours', () => {
    expect(formatTimecode(65)).toBe('1:05')
    expect(formatTimecode(3723)).toBe('1:02:03')
    expect(formatTimecode(-4)).toBe('0:00')
  })
})
