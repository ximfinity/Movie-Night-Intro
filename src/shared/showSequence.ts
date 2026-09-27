/** Clamps a requested playlist position to a valid index (0 for an empty playlist). */
export function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0
  return Math.min(Math.max(Math.trunc(index), 0), length - 1)
}

/** The playlist index to play after `index`, or null when the show should end. */
export function nextItemIndex(index: number, length: number, loop: boolean): number | null {
  if (length <= 0) return null
  if (index + 1 < length) return index + 1
  return loop ? 0 : null
}
