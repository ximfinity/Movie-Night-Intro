import type { TransitionStyle } from '@shared/types'

export const TRANSITION_MS = 600

export function enterDurationMs(transition: TransitionStyle): number {
  return transition === 'none' ? 0 : TRANSITION_MS
}
