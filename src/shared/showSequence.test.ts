import { describe, expect, it } from 'vitest'
import { clampIndex, nextItemIndex } from './showSequence'

describe('nextItemIndex', () => {
  it('advances through the playlist', () => {
    expect(nextItemIndex(0, 3, false)).toBe(1)
    expect(nextItemIndex(1, 3, false)).toBe(2)
  })

  it('ends after the last item unless looping', () => {
    expect(nextItemIndex(2, 3, false)).toBeNull()
    expect(nextItemIndex(2, 3, true)).toBe(0)
  })

  it('loops a one-item playlist onto itself', () => {
    expect(nextItemIndex(0, 1, true)).toBe(0)
    expect(nextItemIndex(0, 1, false)).toBeNull()
  })

  it('ends an empty playlist', () => {
    expect(nextItemIndex(0, 0, true)).toBeNull()
  })
})

describe('clampIndex', () => {
  it('keeps a start position inside the playlist', () => {
    expect(clampIndex(-3, 4)).toBe(0)
    expect(clampIndex(2, 4)).toBe(2)
    expect(clampIndex(9, 4)).toBe(3)
    expect(clampIndex(1.7, 4)).toBe(1)
    expect(clampIndex(5, 0)).toBe(0)
  })
})
