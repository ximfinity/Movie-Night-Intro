import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { mediaFileUrl } from '@shared/paths'
import type { VideoDurations } from '@shared/runtime'

// Video lengths, measured once per file by loading only its metadata, and shared by every
// component that asks. null = the file couldn't be read.
const lengths = new Map<string, number | null>()
const measuring = new Set<string>()
const listeners = new Set<() => void>()
let version = 0

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function measure(url: string): void {
  if (lengths.has(url) || measuring.has(url)) return
  measuring.add(url)
  const el = document.createElement('video')
  el.preload = 'metadata'
  el.muted = true
  let finished = false
  const done = (sec: number | null): void => {
    if (finished) return
    finished = true
    clearTimeout(giveUp)
    el.onloadedmetadata = el.ondurationchange = el.onerror = null
    el.removeAttribute('src')
    el.load()
    measuring.delete(url)
    lengths.set(url, sec)
    version++
    listeners.forEach((l) => l())
  }
  const finite = (): boolean => Number.isFinite(el.duration) && el.duration > 0
  el.onloadedmetadata = () => {
    if (finite()) return done(el.duration)
    // Recordings (e.g. WebM from screen recorders) often report an endless length until
    // the player looks for the end, so seek far past it and read the real length then.
    el.ondurationchange = () => {
      if (finite()) done(el.duration)
    }
    el.currentTime = 1e101
  }
  el.onerror = () => done(null)
  const giveUp = setTimeout(() => done(null), 15000)
  el.src = url
}

/** Lengths of the given project videos; a file is missing from the result while it's
 * being measured or if it couldn't be read. `pending` counts the ones still loading. */
export function useVideoDurations(
  dir: string | null,
  fileNames: string[]
): { durations: VideoDurations; pending: number } {
  const v = useSyncExternalStore(subscribe, () => version)
  const key = [...new Set(fileNames)].sort().join('\n')
  useEffect(() => {
    if (!dir || !key) return
    for (const f of key.split('\n')) measure(mediaFileUrl(dir, 'video', f))
  }, [dir, key])
  return useMemo(() => {
    const durations: VideoDurations = {}
    let pending = 0
    if (dir && key) {
      for (const f of key.split('\n')) {
        const url = mediaFileUrl(dir, 'video', f)
        const sec = lengths.get(url)
        if (sec != null) durations[f] = sec
        else if (sec === undefined) pending++
      }
    }
    return { durations, pending }
    // `v` changes whenever a measurement lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dir, key, v])
}
