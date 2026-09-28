import { describe, expect, it } from 'vitest'
import { toWebVtt } from './subtitles'

describe('toWebVtt', () => {
  it('converts SubRip timings and drops cue numbers', () => {
    const srt =
      '﻿1\r\n00:00:01,000 --> 00:00:02,500\r\nHello there\r\n\r\n2\r\n00:00:03,000 --> 00:00:04,000\r\nSecond line\r\n'
    expect(toWebVtt(srt)).toBe(
      'WEBVTT\n\n00:00:01.000 --> 00:00:02.500\nHello there\n\n00:00:03.000 --> 00:00:04.000\nSecond line\n'
    )
  })

  it('leaves WebVTT alone', () => {
    const vtt = 'WEBVTT\n\n00:01.000 --> 00:02.000\nHi\n'
    expect(toWebVtt(vtt)).toBe(vtt)
  })
})
