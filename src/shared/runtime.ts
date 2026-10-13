// Estimated running time of the pre-show playlist, from each item's own timings plus the
// lengths of its video files (which only the renderer can measure, so they're passed in).
import type { CountdownConfig, PlaylistItem } from './types'
import { countdownActive, parseTimeOfDay } from './countdown'
import { isPlayableQuestion } from './trivia'

/** Video file name → length in seconds; missing while it's still being measured or when
 * the file can't be read. */
export type VideoDurations = Record<string, number | undefined>

export interface ItemRuntime {
  id: string
  /** Best estimate in seconds (0 when unknown). */
  sec: number
  /** True when the item's length depends on a video whose length isn't known (yet). */
  unknown: boolean
}

export interface RuntimeEstimate {
  totalSec: number
  items: ItemRuntime[]
  /** How many items couldn't be measured (their time isn't in the total). */
  unknownCount: number
}

export function itemRuntime(item: PlaylistItem, videos: VideoDurations): ItemRuntime {
  switch (item.type) {
    case 'video': {
      const sec = videos[item.fileName]
      return { id: item.id, sec: sec ?? 0, unknown: sec === undefined }
    }
    case 'slideshow': {
      const m = item.music
      // "Repeat the slides until the video ends": the group lasts exactly as long as the video.
      if (m?.kind === 'video' && m.loopSlidesUntilEnd) {
        const sec = videos[m.fileName]
        return { id: item.id, sec: sec ?? 0, unknown: sec === undefined }
      }
      return {
        id: item.id,
        sec: item.frames.reduce((n, f) => n + f.durationSec, 0),
        unknown: false
      }
    }
    case 'trivia': {
      const n = item.questions.filter(isPlayableQuestion).length
      return { id: item.id, sec: n * (item.questionSec + item.answerSec), unknown: false }
    }
  }
}

/** Transitions overlap the item before rather than adding time, so this is the plain sum. */
export function estimateRuntime(items: PlaylistItem[], videos: VideoDurations): RuntimeEstimate {
  const list = items.map((it) => itemRuntime(it, videos))
  return {
    totalSec: list.reduce((n, it) => n + it.sec, 0),
    items: list,
    unknownCount: list.filter((it) => it.unknown).length
  }
}

export type ShowtimeFit =
  | {
      mode: 'clock'
      /** "HH:mm" */
      showtime: string
      /** "HH:mm": the latest start for one full pass to finish by showtime. */
      latestStart: string
      /** The playlist repeats until showtime, so starting earlier is fine. */
      loops: boolean
    }
  | {
      mode: 'duration'
      countdownSec: number
      /** Playlist length minus countdown length: positive means it runs past zero. */
      overSec: number
    }

/** How one pass of the playlist lines up with the countdown, or null without one. */
export function showtimeFit(totalSec: number, countdown: CountdownConfig): ShowtimeFit | null {
  if (!countdownActive(countdown) || totalSec <= 0) return null
  if (countdown.mode === 'duration') {
    return {
      mode: 'duration',
      countdownSec: countdown.durationSec,
      overSec: totalSec - countdown.durationSec
    }
  }
  const [h, m] = parseTimeOfDay(countdown.targetTime)!
  const startMin = (((h * 60 + m - Math.ceil(totalSec / 60)) % 1440) + 1440) % 1440
  const pad = (n: number): string => String(n).padStart(2, '0')
  return {
    mode: 'clock',
    showtime: `${pad(h)}:${pad(m)}`,
    latestStart: `${pad(Math.floor(startMin / 60))}:${pad(startMin % 60)}`,
    loops: countdown.loopPlaylistUntilShowtime
  }
}
