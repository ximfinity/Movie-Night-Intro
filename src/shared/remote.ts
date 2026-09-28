// Protocol between the phone remote page, the main process's web server and the renderer.

export type RemotePhase =
  'home' | 'editor' | 'preshow' | 'hold' | 'intro' | 'movie' | 'handoff' | 'ended'

export interface RemoteMovieStatus {
  positionSec: number
  durationSec: number
  paused: boolean
  hasSubtitles: boolean
  subtitlesOn: boolean
}

/** What the renderer reports for the remote to show. Times are epoch ms on the PC's clock
 * (the server sends its own "now" alongside, so a phone with a wrong clock still counts
 * down correctly). */
export interface RemoteState {
  phase: RemotePhase
  projectName: string
  movieTitle: string
  /** Editor: whether a show can be started. */
  canStart: boolean
  /** Editor: seconds into the movie an interrupted showing can resume from. */
  resumeAtSec: number | null
  itemTitle: string
  itemIndex: number
  itemCount: number
  paused: boolean
  /** When the countdown reaches zero, or null with no countdown. */
  showtimeAt: number | null
  /** The pre-show will go to the hold screen after the current item. */
  wrappingUp: boolean
  /** Hold screen in auto mode: when the movie rolls by itself. */
  rollAt: number | null
  /** Whether there is a movie to start at all. */
  hasFeature: boolean
  volume: number
  movie: RemoteMovieStatus | null
  /** Handoff: the movie is playing outside the app. */
  handoffTo: 'player' | 'browser' | null
}

export const IDLE_REMOTE_STATE: RemoteState = {
  phase: 'home',
  projectName: '',
  movieTitle: '',
  canStart: false,
  resumeAtSec: null,
  itemTitle: '',
  itemIndex: 0,
  itemCount: 0,
  paused: false,
  showtimeAt: null,
  wrappingUp: false,
  rollAt: null,
  hasFeature: false,
  volume: 1,
  movie: null,
  handoffTo: null
}

export const REMOTE_COMMANDS = [
  'startShow',
  'resumeMovie',
  'wrapUp',
  'cancelWrapUp',
  'startMovie',
  'togglePause',
  'next',
  'prev',
  /** value: change in volume, e.g. 0.1 or -0.1 */
  'volume',
  /** value: minutes to move showtime by, e.g. 5 or -5 */
  'shiftShowtime',
  /** value: minutes from now */
  'startIn',
  'toggleSubtitles',
  /** value: seconds, e.g. -10 */
  'seek',
  'showEndCard',
  'exitShow'
] as const

export type RemoteCommandName = (typeof REMOTE_COMMANDS)[number]

export interface RemoteCommand {
  cmd: RemoteCommandName
  value?: number
}

export function isRemoteCommand(v: unknown): v is RemoteCommand {
  if (typeof v !== 'object' || v === null) return false
  const { cmd, value } = v as Record<string, unknown>
  return (
    REMOTE_COMMANDS.includes(cmd as RemoteCommandName) &&
    (value === undefined || (typeof value === 'number' && Number.isFinite(value)))
  )
}

/** Status of the phone remote's web server, shown in the editor. */
export interface RemoteServerStatus {
  enabled: boolean
  running: boolean
  port: number
  pin: string
  /** http://address:port for each network the PC is on. */
  urls: string[]
  error: string | null
}
