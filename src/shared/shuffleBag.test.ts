import { describe, expect, it } from 'vitest'
import { createShuffleBag } from './shuffleBag'

describe('createShuffleBag', () => {
  it('shows every option once per round', () => {
    const pick = createShuffleBag()
    for (let round = 0; round < 20; round++) {
      const seen = new Set(Array.from({ length: 4 }, () => pick('slide', 4)))
      expect(seen.size).toBe(4)
    }
  })

  it('never repeats the same option back-to-back, even across rounds', () => {
    const pick = createShuffleBag()
    let last = -1
    for (let i = 0; i < 500; i++) {
      const next = pick('slide', 3)
      expect(next).not.toBe(last)
      last = next
    }
  })

  it('keeps separate rotations per key and restarts when the option count changes', () => {
    const pick = createShuffleBag()
    const a = Array.from({ length: 2 }, () => pick('a', 2))
    const b = Array.from({ length: 2 }, () => pick('b', 2))
    expect(new Set(a).size).toBe(2)
    expect(new Set(b).size).toBe(2)
    const resized = new Set(Array.from({ length: 5 }, () => pick('a', 5)))
    expect(resized.size).toBe(5)
  })

  it('handles one option and no options', () => {
    const pick = createShuffleBag()
    expect(pick('x', 1)).toBe(0)
    expect(pick('x', 1)).toBe(0)
    expect(pick('y', 0)).toBe(-1)
  })
})
