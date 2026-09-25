import { useEffect, useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import type { TransitionStyle } from '@shared/types'
import { enterDurationMs } from './transitions'

export default function TransitionLayer({
  transition,
  exiting,
  exitDurationMs,
  children
}: {
  transition: TransitionStyle
  exiting: boolean
  exitDurationMs: number
  children: ReactNode
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const hasEnteredRef = useRef(false)

  useEffect(() => {
    if (hasEnteredRef.current) return
    hasEnteredRef.current = true
    const el = ref.current
    const duration = enterDurationMs(transition) / 1000
    if (!el || duration === 0) return

    const fromVars: gsap.TweenVars = { opacity: 0 }
    if (transition === 'slide-left') fromVars.xPercent = 5
    if (transition === 'slide-up') fromVars.yPercent = 5
    if (transition === 'zoom') fromVars.scale = 1.07

    gsap.fromTo(el, fromVars, {
      opacity: 1,
      xPercent: 0,
      yPercent: 0,
      scale: 1,
      duration,
      ease: 'power2.out'
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!exiting) return
    const el = ref.current
    if (!el) return
    gsap.to(el, {
      opacity: 0,
      duration: Math.max(0.001, exitDurationMs / 1000),
      ease: 'power2.in'
    })
  }, [exiting, exitDurationMs])

  return (
    <div ref={ref} className="stage-layer">
      {children}
    </div>
  )
}
