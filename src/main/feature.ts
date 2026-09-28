import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { extname, join } from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'

/** Everything a movie can be handed to the PC's default player as — wider than what the
 * built-in player can decode, since VLC and friends play nearly anything. */
const MOVIE_EXTENSIONS = [
  'mp4',
  'm4v',
  'mkv',
  'webm',
  'mov',
  'avi',
  'wmv',
  'mpg',
  'mpeg',
  'ts',
  'm2ts',
  'vob',
  'flv'
]
const SUBTITLE_EXTENSIONS = ['srt', 'vtt']
const MAX_SUBTITLE_BYTES = 5 * 1024 * 1024

export interface ResumePoint {
  filePath: string
  positionSec: number
  durationSec: number
  savedAt: string
}

function hasExtension(path: string, allowed: string[]): boolean {
  return allowed.includes(extname(path).slice(1).toLowerCase())
}

function resumeFile(): string {
  return join(app.getPath('userData'), 'resume.json')
}

async function readResume(): Promise<ResumePoint | null> {
  try {
    const raw = JSON.parse(await fs.readFile(resumeFile(), 'utf-8'))
    if (typeof raw?.filePath !== 'string' || typeof raw?.positionSec !== 'number') return null
    return raw as ResumePoint
  } catch {
    return null
  }
}

export function registerFeatureHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('feature:pickMovie', async (): Promise<string | null> => {
    const win = getWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      title: 'Choose the movie file',
      properties: ['openFile'],
      filters: [
        { name: 'Movies', extensions: MOVIE_EXTENSIONS },
        { name: 'All files', extensions: ['*'] }
      ]
    })
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })

  ipcMain.handle('feature:pickSubtitles', async (): Promise<string | null> => {
    const win = getWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      title: 'Choose a subtitle file',
      properties: ['openFile'],
      filters: [{ name: 'Subtitles', extensions: SUBTITLE_EXTENSIONS }]
    })
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })

  ipcMain.handle('feature:readSubtitles', async (_evt, path: string): Promise<string> => {
    if (typeof path !== 'string' || !hasExtension(path, SUBTITLE_EXTENSIONS)) {
      throw new Error('Not a subtitle file.')
    }
    const stat = await fs.stat(path)
    if (stat.size > MAX_SUBTITLE_BYTES) throw new Error('The subtitle file is too large.')
    return fs.readFile(path, 'utf-8')
  })

  ipcMain.handle('feature:fileExists', (_evt, path: string): boolean => {
    return typeof path === 'string' && path.length > 0 && existsSync(path)
  })

  /** Opens the movie in the PC's default player. Only video files: this must never become
   * a way to launch arbitrary programs. */
  ipcMain.handle('feature:openInPlayer', async (_evt, path: string): Promise<void> => {
    if (typeof path !== 'string' || !hasExtension(path, MOVIE_EXTENSIONS)) {
      throw new Error("That file doesn't look like a movie.")
    }
    if (!existsSync(path)) throw new Error(`The movie file can't be found:\n${path}`)
    const error = await shell.openPath(path)
    if (error) throw new Error(error)
  })

  ipcMain.handle('feature:openStream', async (_evt, url: string): Promise<void> => {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw new Error("That streaming link isn't a valid web address.")
    }
    if (parsed.protocol !== 'https:') throw new Error('Streaming links must start with https://')
    await shell.openExternal(parsed.toString())
  })

  /** Steps aside for an external player or browser: leave fullscreen and minimize. */
  ipcMain.handle('app:handOff', () => {
    const win = getWindow()
    if (!win) return
    if (!win.isFullScreen()) {
      win.minimize()
      return
    }
    // Leaving fullscreen can finish asynchronously; minimize once it has, with a fallback in
    // case the event never arrives.
    const minimize = (): void => {
      clearTimeout(fallback)
      if (!win.isDestroyed() && !win.isMinimized()) win.minimize()
    }
    const fallback = setTimeout(minimize, 800)
    win.once('leave-full-screen', minimize)
    win.setFullScreen(false)
  })

  /** Brings the show back (e.g. for the thanks card after an external movie). */
  ipcMain.handle('app:bringBack', () => {
    const win = getWindow()
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
    win.setFullScreen(true)
  })

  ipcMain.handle('resume:get', async (_evt, filePath: string): Promise<ResumePoint | null> => {
    const point = await readResume()
    return point && point.filePath === filePath ? point : null
  })

  ipcMain.handle(
    'resume:save',
    async (_evt, filePath: string, positionSec: number, durationSec: number) => {
      if (typeof filePath !== 'string' || !Number.isFinite(positionSec)) return
      const point: ResumePoint = {
        filePath,
        positionSec,
        durationSec: Number.isFinite(durationSec) ? durationSec : 0,
        savedAt: new Date().toISOString()
      }
      await fs.writeFile(resumeFile(), JSON.stringify(point), 'utf-8')
    }
  )

  ipcMain.handle('resume:clear', async () => {
    await fs.rm(resumeFile(), { force: true })
  })
}
