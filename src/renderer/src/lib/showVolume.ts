import gsap from 'gsap'

/** Show-wide volume (the phone remote's and the ↑/↓ keys' volume), multiplied into every
 * clip, music track and the movie. Each media element keeps its own level (its item's
 * volume, or wherever a fade has got to), so turning the show up or down never fights a
 * fade in progress. */
let master = 1
const elements = new Set<ScaledVolume>()
const listeners = new Set<() => void>()

export function getShowVolume(): number {
  return master
}

export function setShowVolume(v: number): void {
  master = Math.min(1, Math.max(0, Math.round(v * 100) / 100))
  elements.forEach((e) => e.apply())
  listeners.forEach((l) => l())
}

export function subscribeShowVolume(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Drives one media element's volume as `level × show volume`. Fades tween `level`. */
export class ScaledVolume {
  level = 0
  private readonly el: HTMLMediaElement

  constructor(el: HTMLMediaElement, level = 0) {
    this.el = el
    this.level = level
    elements.add(this)
    this.apply()
  }

  apply(): void {
    this.el.volume = Math.min(1, Math.max(0, this.level * master))
  }

  set(level: number): void {
    gsap.killTweensOf(this)
    this.level = level
    this.apply()
  }

  fadeTo(
    level: number,
    durationSec: number,
    opts: { overwrite?: boolean; onComplete?: () => void } = {}
  ): void {
    gsap.to(this, {
      level,
      duration: Math.max(0.05, durationSec),
      ease: 'linear',
      overwrite: opts.overwrite ?? false,
      onUpdate: () => this.apply(),
      onComplete: opts.onComplete
    })
  }

  stopFades(): void {
    gsap.killTweensOf(this)
  }

  dispose(): void {
    gsap.killTweensOf(this)
    elements.delete(this)
  }
}
