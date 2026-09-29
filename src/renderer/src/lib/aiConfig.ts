import { useEffect, useSyncExternalStore } from 'react'
import type { AiConfigView } from '@shared/ai'

/** The connected-AI settings, shared by every screen (loaded once, refreshed whenever the
 * ✨ AI settings change them). */
let config: AiConfigView | null = null
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

export function setAiConfig(next: AiConfigView): void {
  config = next
  emit()
}

export function reloadAiConfig(): Promise<void> {
  loading = window.api
    .getAiConfig()
    .then(setAiConfig)
    .catch((err) => {
      console.warn('Could not load AI settings:', err)
      loading = null // try again the next time a screen asks
    })
  return loading
}

export function useAiConfig(): AiConfigView | null {
  const value = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => config
  )
  useEffect(() => {
    if (!config && !loading) reloadAiConfig()
  }, [])
  return value
}
