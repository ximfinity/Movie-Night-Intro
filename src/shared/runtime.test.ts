import { describe, expect, it } from 'vitest'
import { estimateRuntime, showtimeFit } from './runtime'
import {
  DEFAULT_SLIDE_STYLE,
  createDefaultCountdown,
  createSlideFrame,
  createSlideshowItem,
  createVideoItem
} from './factory'
import { createTriviaItem, starterQuestions, createTriviaQuestion } from './trivia'
import type { SlideshowItem } from './types'

function group(...secs: number[]): SlideshowItem {
  return {
    ...createSlideshowItem(),
    frames: secs.map((s) => createSlideFrame('text', { ...DEFAULT_SLIDE_STYLE, durationSec: s }))
  }
}

describe('estimateRuntime', () => {
  it('adds slide durations, trivia timings and measured videos', () => {
    const trivia = {
      ...createTriviaItem([...starterQuestions().slice(0, 3), createTriviaQuestion()]),
      questionSec: 10,
      answerSec: 5
    }
    const est = estimateRuntime([group(6, 8), createVideoItem('a.mp4', 'A'), trivia], {
      'a.mp4': 95.4
    })
    expect(est.items.map((i) => i.sec)).toEqual([14, 95.4, 45]) // blank question skipped
    expect(est.totalSec).toBeCloseTo(154.4)
    expect(est.unknownCount).toBe(0)
  })

  it('a group that loops until its video ends lasts as long as the video', () => {
    const g = group(6, 6)
    g.music = {
      kind: 'video',
      fileName: 'clip.mp4',
      displayName: 'Clip',
      volume: 1,
      fadeInSec: 1,
      fadeOutSec: 1,
      layout: 'corner',
      position: 'bottom-left',
      sizeScale: 3,
      loopSlidesUntilEnd: true
    }
    expect(estimateRuntime([g], { 'clip.mp4': 200 }).totalSec).toBe(200)
    const unmeasured = estimateRuntime([g, createVideoItem('b.mp4', 'B')], {})
    expect(unmeasured.unknownCount).toBe(2)
    expect(unmeasured.totalSec).toBe(0)
  })
})

describe('showtimeFit', () => {
  it('gives the latest start time in clock mode, rounding up to whole minutes', () => {
    const c = {
      ...createDefaultCountdown(),
      enabled: true,
      mode: 'clock' as const,
      targetTime: '18:30'
    }
    expect(showtimeFit(14 * 60 + 20, c)).toMatchObject({ mode: 'clock', latestStart: '18:15' })
    expect(showtimeFit(45 * 60, { ...c, targetTime: '00:15' })).toMatchObject({
      latestStart: '23:30'
    })
  })

  it('compares with the countdown length in duration mode', () => {
    const c = {
      ...createDefaultCountdown(),
      enabled: true,
      mode: 'duration' as const,
      durationSec: 300
    }
    expect(showtimeFit(420, c)).toEqual({ mode: 'duration', countdownSec: 300, overSec: 120 })
  })

  it('says nothing without a countdown', () => {
    expect(showtimeFit(300, { ...createDefaultCountdown(), enabled: false })).toBeNull()
    expect(showtimeFit(0, { ...createDefaultCountdown(), enabled: true })).toBeNull()
  })
})
