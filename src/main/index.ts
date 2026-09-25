import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, basename, extname, dirname } from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type { ImportedMediaFile, MediaKind, OpenProjectResult, ProjectData } from '../shared/types'

let mainWindow: BrowserWindow | null = null

const MEDIA_SUBDIR: Record<MediaKind, string> = {
  video: 'media/videos',
  audio: 'media/audio',
  image: 'media/images'
}

const MEDIA_FILTERS: Record<MediaKind, Electron.FileFilter[]> = {
  video: [{ name: 'Video files', extensions: ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v'] }],
  audio: [{ name: 'Audio files', extensions: ['mp3', 'm4a', 'wav', 'ogg', 'aac', 'flac'] }],
  image: [{ name: 'Image files', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0b0e14',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

async function ensureProjectFolders(dir: string): Promise<void> {
  await fs.mkdir(join(dir, 'media/videos'), { recursive: true })
  await fs.mkdir(join(dir, 'media/audio'), { recursive: true })
  await fs.mkdir(join(dir, 'media/images'), { recursive: true })
}

async function uniqueDestPath(dir: string, fileName: string): Promise<string> {
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

function registerIpcHandlers(): void {
  ipcMain.handle('project:selectNewFolder', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose or create a folder for your project',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const dir = result.filePaths[0]
    await ensureProjectFolders(dir)
    return dir
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
    const dir = dirname(filePath)
    const raw = await fs.readFile(filePath, 'utf-8')
    const project = JSON.parse(raw) as ProjectData
    await ensureProjectFolders(dir)
    return { dir, project }
  })

  ipcMain.handle('project:save', async (_evt, dir: string, project: ProjectData) => {
    await ensureProjectFolders(dir)
    await fs.writeFile(join(dir, 'project.json'), JSON.stringify(project, null, 2), 'utf-8')
  })

  ipcMain.handle(
    'media:import',
    async (_evt, dir: string, kind: MediaKind): Promise<ImportedMediaFile[]> => {
      if (!mainWindow) return []
      const result = await dialog.showOpenDialog(mainWindow, {
        title: `Import ${kind} files`,
        properties: ['openFile', 'multiSelections'],
        filters: MEDIA_FILTERS[kind]
      })
      if (result.canceled || result.filePaths.length === 0) return []

      const destDir = join(dir, MEDIA_SUBDIR[kind])
      await fs.mkdir(destDir, { recursive: true })

      const imported: ImportedMediaFile[] = []
      for (const srcPath of result.filePaths) {
        const original = basename(srcPath)
        const destName = await uniqueDestPath(destDir, original)
        await fs.copyFile(srcPath, join(destDir, destName))
        imported.push({ fileName: destName, displayName: original })
      }
      return imported
    }
  )

  ipcMain.handle('app:setFullscreen', async (_evt, flag: boolean) => {
    mainWindow?.setFullScreen(flag)
    if (flag) mainWindow?.setMenuBarVisibility(false)
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.movienightintro.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
