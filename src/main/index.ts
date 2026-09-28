import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, basename, dirname, extname, resolve } from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type {
  ImportedMediaFile,
  MediaKind,
  MediaRef,
  NewProjectChoice,
  OpenProjectResult,
  TemplateInsertResult,
  TemplateSummary
} from '../shared/types'
import { PROJECT_FILE_NAME } from '../shared/types'
import { mediaRelPath } from '../shared/paths'
import { deleteTemplate, insertTemplate, listTemplates, saveTemplate } from './templates'
import { registerFeatureHandlers } from './feature'
import { registerQrHandlers } from './qr'
import { initRemote, shutdownRemote } from './remote'

let mainWindow: BrowserWindow | null = null
/** Mirrors the editor's "unsaved changes" state so closing the window can ask first. */
let rendererDirty = false
let forceClose = false

const MEDIA_KINDS: MediaKind[] = ['video', 'audio', 'image']

const MEDIA_FILTERS: Record<MediaKind, Electron.FileFilter[]> = {
  // No .avi: Chromium can't decode it, so it would only ever be skipped at show time.
  video: [{ name: 'Video files', extensions: ['mp4', 'webm', 'mov', 'mkv', 'm4v'] }],
  audio: [{ name: 'Audio files', extensions: ['mp3', 'm4a', 'wav', 'ogg', 'aac', 'flac'] }],
  image: [{ name: 'Image files', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]
}

/** Rejects anything that isn't a plain file name, so values coming from the renderer (or a
 * hand-edited project file) can't reach outside the project folder. */
function isPlainFileName(name: unknown): name is string {
  return (
    typeof name === 'string' &&
    name.length > 0 &&
    name !== '.' &&
    name !== '..' &&
    !/[\\/]/.test(name) &&
    basename(name) === name
  )
}

function assertKind(kind: unknown): asserts kind is MediaKind {
  if (!MEDIA_KINDS.includes(kind as MediaKind)) throw new Error(`Unknown media kind: ${kind}`)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0b0e14',
    ...(process.platform !== 'darwin' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (e) => {
    if (forceClose || !rendererDirty || !mainWindow) return
    e.preventDefault()
    dialog
      .showMessageBox(mainWindow, {
        type: 'warning',
        buttons: ['Save and close', "Don't save", 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        message: 'You have unsaved changes.',
        detail: 'Save them before closing?'
      })
      .then(({ response }) => {
        if (response === 0) mainWindow?.webContents.send('app:saveAndClose')
        else if (response === 1) {
          forceClose = true
          mainWindow?.close()
        }
      })
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (details.url.startsWith('https://')) shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

async function ensureProjectFolders(dir: string): Promise<void> {
  for (const kind of MEDIA_KINDS) {
    await fs.mkdir(join(dir, mediaRelPath(kind, '')), { recursive: true })
  }
}

async function uniqueDestName(dir: string, fileName: string): Promise<string> {
  const ext = extname(fileName)
  const base = basename(fileName, ext)
  let candidate = fileName
  let n = 1
  while (existsSync(join(dir, candidate))) {
    candidate = `${base}-${n}${ext}`
    n += 1
  }
  return candidate
}

async function readProjectFile(dir: string, fileName: string): Promise<OpenProjectResult> {
  const raw = await fs.readFile(join(dir, fileName), 'utf-8')
  let project: unknown
  try {
    project = JSON.parse(raw)
  } catch {
    const bak = existsSync(join(dir, `${fileName}.bak`))
      ? ` A backup of the previous save is next to it as "${fileName}.bak" — rename it to "${fileName}" to recover.`
      : ''
    throw new Error(`"${fileName}" isn't valid project data; it may be damaged.${bak}`)
  }
  await ensureProjectFolders(dir)
  return { dir, fileName, project }
}

/** Crash-safe save: write a temp file, keep the previous version as .bak, then swap the new
 * file into place, so a crash or power cut mid-save can't leave a truncated project. */
async function writeProjectFile(dir: string, fileName: string, data: unknown): Promise<void> {
  const target = join(dir, fileName)
  const tmp = `${target}.tmp`
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
  if (existsSync(target)) await fs.copyFile(target, `${target}.bak`)
  try {
    await fs.rename(tmp, target)
  } catch (err) {
    // Windows can briefly lock a file (antivirus, indexer); one retry covers that.
    if ((err as NodeJS.ErrnoException).code !== 'EPERM') throw err
    await new Promise((r) => setTimeout(r, 150))
    await fs.rename(tmp, target)
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle('project:selectNewFolder', async (): Promise<NewProjectChoice | null> => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose or create a folder for your project',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const dir = result.filePaths[0]
    if (existsSync(join(dir, PROJECT_FILE_NAME))) {
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Open that project', 'Start over and replace it', 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        message: 'This folder already has a Movie Night project.',
        detail:
          'Open it to keep working on it, or start over with an empty project (the old one is kept as project.json.bak).'
      })
      if (response === 2) return null
      if (response === 0)
        return { kind: 'open', ...(await readProjectFile(dir, PROJECT_FILE_NAME)) }
    }
    await ensureProjectFolders(dir)
    return { kind: 'new', dir }
  })

  ipcMain.handle('project:openExisting', async (): Promise<OpenProjectResult | null> => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open a Movie Night project',
      properties: ['openFile'],
      filters: [{ name: 'Movie Night Project', extensions: ['json'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    return readProjectFile(dirname(filePath), basename(filePath))
  })

  ipcMain.handle('project:save', async (_evt, dir: string, fileName: string, project: unknown) => {
    if (!isPlainFileName(fileName) || !fileName.endsWith('.json')) {
      throw new Error(`Refusing to save to "${fileName}".`)
    }
    await ensureProjectFolders(dir)
    await writeProjectFile(dir, fileName, project)
  })

  ipcMain.handle(
    'project:saveAs',
    async (
      _evt,
      fromDir: string,
      project: Record<string, unknown>
    ): Promise<{ dir: string; name: string } | null> => {
      if (!mainWindow) return null
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Choose or create a folder for the copy',
        properties: ['openDirectory', 'createDirectory']
      })
      if (result.canceled || result.filePaths.length === 0) return null
      const dir = result.filePaths[0]
      if (resolve(dir) === resolve(fromDir)) {
        throw new Error('That is the folder this project is already in — choose a different one.')
      }
      if (existsSync(join(dir, PROJECT_FILE_NAME))) {
        const { response } = await dialog.showMessageBox(mainWindow, {
          type: 'warning',
          buttons: ['Replace it', 'Cancel'],
          defaultId: 1,
          cancelId: 1,
          message: 'That folder already has a Movie Night project.',
          detail: 'Replace it with a copy of this one? The old one is kept as project.json.bak.'
        })
        if (response !== 0) return null
      }
      const srcMedia = join(fromDir, 'media')
      if (existsSync(srcMedia)) {
        await fs.cp(srcMedia, join(dir, 'media'), { recursive: true, force: true })
      }
      await ensureProjectFolders(dir)
      const name = basename(dir)
      await writeProjectFile(dir, PROJECT_FILE_NAME, { ...project, name })
      return { dir, name }
    }
  )

  ipcMain.handle('templates:list', (): Promise<TemplateSummary[]> => listTemplates())

  ipcMain.handle(
    'templates:save',
    (_evt, projectDir: string, name: string, item: Record<string, unknown>) =>
      saveTemplate(projectDir, String(name ?? ''), item)
  )

  ipcMain.handle(
    'templates:insert',
    (_evt, id: string, projectDir: string): Promise<TemplateInsertResult> =>
      insertTemplate(id, projectDir)
  )

  ipcMain.handle('templates:delete', (_evt, id: string) => deleteTemplate(id))

  ipcMain.handle('media:pickFiles', async (_evt, kind: MediaKind): Promise<string[]> => {
    assertKind(kind)
    if (!mainWindow) return []
    const result = await dialog.showOpenDialog(mainWindow, {
      title: `Import ${kind} files`,
      properties: ['openFile', 'multiSelections'],
      filters: MEDIA_FILTERS[kind]
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle(
    'media:copyIntoProject',
    async (
      _evt,
      dir: string,
      kind: MediaKind,
      srcPaths: string[]
    ): Promise<{ imported: ImportedMediaFile[]; failed: { name: string; error: string }[] }> => {
      assertKind(kind)
      const destDir = join(dir, mediaRelPath(kind, ''))
      await fs.mkdir(destDir, { recursive: true })
      const imported: ImportedMediaFile[] = []
      const failed: { name: string; error: string }[] = []
      for (const srcPath of srcPaths) {
        const original = basename(srcPath)
        try {
          const destName = await uniqueDestName(destDir, original)
          await fs.copyFile(srcPath, join(destDir, destName))
          imported.push({ fileName: destName, displayName: original })
        } catch (err) {
          failed.push({ name: original, error: (err as Error).message })
        }
      }
      return { imported, failed }
    }
  )

  ipcMain.handle(
    'media:checkExists',
    async (_evt, dir: string, refs: MediaRef[]): Promise<MediaRef[]> => {
      return refs.filter(
        (ref) =>
          !MEDIA_KINDS.includes(ref.kind) ||
          !isPlainFileName(ref.fileName) ||
          !existsSync(join(dir, mediaRelPath(ref.kind, ref.fileName)))
      )
    }
  )

  ipcMain.handle('app:setFullscreen', async (_evt, flag: boolean) => {
    mainWindow?.setFullScreen(flag)
    if (flag) mainWindow?.setMenuBarVisibility(false)
  })

  ipcMain.on('app:setDirty', (_evt, flag: boolean) => {
    rendererDirty = flag === true
  })

  ipcMain.on('app:closeWindow', () => {
    forceClose = true
    mainWindow?.close()
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.movienightintro.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  registerFeatureHandlers(() => mainWindow)
  registerQrHandlers()
  createWindow()
  initRemote(() => mainWindow).catch((err) => console.error('Phone remote failed to start:', err))

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  shutdownRemote()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
