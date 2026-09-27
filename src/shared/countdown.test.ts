import { describe, expect, it } from 'vitest'
import { shouldLoopPlaylist, targetTimeToEpoch } from './countdown'
import { createDefaultCountdown } from './factory'

const at = (h: number, m: number): number => new Date(2026, 8, 26, h, m, 0, 0).getTime()

describe('targetTimeToEpoch', () => {
  it('resolves to today when the time is later today', () => {
    expect(targetTimeToEpoch('20:00', at(19, 30))).toBe(at(20, 0))
  })

  it('stays today for a showtime that just passed (show running late)', () => {
    expect(targetTimeToEpoch('20:00', at(21, 15))).toBe(at(20, 0))
  })

  it('rolls over to tomorrow for a just-after-midnight showtime', () => {
    const target = targetTimeToEpoch('00:30', at(23, 30))
    expect(target - at(23, 30)).toBe(60 * 60 * 1000)
  })

  it('treats an unreadable time as now', () => {
    expect(targetTimeToEpoch('soon', at(12, 0))).toBe(at(12, 0))
  })
})

describe('shouldLoopPlaylist', () => {
  const clock = {
    ...createDefaultCountdown(),
    mode: 'clock' as const,
    targetTime: '20:00',
    loopPlaylistUntilShowtime: true
  }

  it('loops before showtime and stops after it', () => {
    expect(shouldLoopPlaylist(clock, at(19, 0))).toBe(true)
    expect(shouldLoopPlaylist(clock, at(20, 1))).toBe(false)
  })

  it('only loops when enabled, in clock mode, with the countdown on', () => {
    expect(shouldLoopPlaylist({ ...clock, loopPlaylistUntilShowtime: false }, at(19, 0))).toBe(
      false
    )
    expect(shouldLoopPlaylist({ ...clock, mode: 'duration' }, at(19, 0))).toBe(false)
    expect(shouldLoopPlaylist({ ...clock, enabled: false }, at(19, 0))).toBe(false)
  })
})
