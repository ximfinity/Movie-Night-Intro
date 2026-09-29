import { clipboard, contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  ImportedMediaFile,
  MediaKind,
  MediaRef,
  NewProjectChoice,
  OpenProjectResult,
  ProjectData,
  SlideshowItem,
  TemplateInsertResult,
  TemplateSummary
} from '../shared/types'
import type { RemoteCommand, RemoteServerStatus, RemoteState } from '../shared/remote'
import type { AiConfigView, AiProviderId, AiSettingsPatch, GeneratedImage } from '../shared/ai'

export interface ResumePoint {
  filePath: string
  positionSec: number
  durationSec: number
  savedAt: string
}

const api = {
  selectNewProjectFolder: (): Promise<NewProjectChoice | null> =>
    ipcRenderer.invoke('project:selectNewFolder'),
  openExistingProject: (): Promise<OpenProjectResult | null> =>
    ipcRenderer.invoke('project:openExisting'),
  saveProject: (dir: string, fileName: string, project: ProjectData): Promise<void> =>
    ipcRenderer.invoke('project:save', dir, fileName, project),
  /** Copies the project (with its media) into a folder the user picks. */
  saveProjectAs: (
    dir: string,
    project: ProjectData
  ): Promise<{ dir: string; name: string } | null> =>
    ipcRenderer.invoke('project:saveAs', dir, project),
  listTemplates: (): Promise<TemplateSummary[]> => ipcRenderer.invoke('templates:list'),
  saveTemplate: (
    projectDir: string,
    name: string,
    item: SlideshowItem
  ): Promise<{ template: TemplateSummary; missing: string[] }> =>
    ipcRenderer.invoke('templates:save', projectDir, name, item),
  insertTemplate: (id: string, projectDir: string): Promise<TemplateInsertResult> =>
    ipcRenderer.invoke('templates:insert', id, projectDir),
  deleteTemplate: (id: string): Promise<void> => ipcRenderer.invoke('templates:delete', id),
  pickMediaFiles: (kind: MediaKind): Promise<string[]> =>
    ipcRenderer.invoke('media:pickFiles', kind),
  copyMediaIntoProject: (
    dir: string,
    kind: MediaKind,
    srcPaths: string[]
  ): Promise<{ imported: ImportedMediaFile[]; failed: { name: string; error: string }[] }> =>
    ipcRenderer.invoke('media:copyIntoProject', dir, kind, srcPaths),
  checkMediaExists: (dir: string, refs: MediaRef[]): Promise<MediaRef[]> =>
    ipcRenderer.invoke('media:checkExists', dir, refs),
  setFullscreen: (flag: boolean): Promise<void> => ipcRenderer.invoke('app:setFullscreen', flag),
  copyText: (text: string): void => clipboard.writeText(text),
  setDirty: (flag: boolean): void => ipcRenderer.send('app:setDirty', flag),
  closeWindow: (): void => ipcRenderer.send('app:closeWindow'),
  // Feature presentation
  pickMovieFile: (): Promise<string | null> => ipcRenderer.invoke('feature:pickMovie'),
  pickSubtitleFile: (): Promise<string | null> => ipcRenderer.invoke('feature:pickSubtitles'),
  readSubtitles: (path: string): Promise<string> =>
    ipcRenderer.invoke('feature:readSubtitles', path),
  fileExists: (path: string): Promise<boolean> => ipcRenderer.invoke('feature:fileExists', path),
  openInPlayer: (path: string): Promise<void> => ipcRenderer.invoke('feature:openInPlayer', path),
  openStream: (url: string): Promise<void> => ipcRenderer.invoke('feature:openStream', url),
  handOff: (): Promise<void> => ipcRenderer.invoke('app:handOff'),
  bringBack: (): Promise<void> => ipcRenderer.invoke('app:bringBack'),
  getResumePoint: (filePath: string): Promise<ResumePoint | null> =>
    ipcRenderer.invoke('resume:get', filePath),
  saveResumePoint: (filePath: string, positionSec: number, durationSec: number): Promise<void> =>
    ipcRenderer.invoke('resume:save', filePath, positionSec, durationSec),
  clearResumePoint: (): Promise<void> => ipcRenderer.invoke('resume:clear'),
  /** Writes a full-screen QR-code slide image for a link into the project's images. */
  makeQrSlide: (dir: string, url: string): Promise<ImportedMediaFile> =>
    ipcRenderer.invoke('media:makeQrSlide', dir, url),
  saveImageData: (
    dir: string,
    baseName: string,
    mimeType: string,
    base64: string
  ): Promise<ImportedMediaFile> =>
    ipcRenderer.invoke('media:saveImageData', dir, baseName, mimeType, base64),
  readImageDataUrl: (dir: string, fileName: string): Promise<string> =>
    ipcRenderer.invoke('media:readImageDataUrl', dir, fileName),
  // Bring-your-own AI (keys stay in the main process)
  getAiConfig: (): Promise<AiConfigView> => ipcRenderer.invoke('ai:getConfig'),
  updateAiSettings: (patch: AiSettingsPatch): Promise<AiConfigView> =>
    ipcRenderer.invoke('ai:updateSettings', patch),
  setAiKey: (provider: AiProviderId, key: string): Promise<AiConfigView> =>
    ipcRenderer.invoke('ai:setKey', provider, key),
  listAiModels: (provider: AiProviderId): Promise<string[]> =>
    ipcRenderer.invoke('ai:listModels', provider),
  testAi: (provider: AiProviderId): Promise<string> => ipcRenderer.invoke('ai:test', provider),
  aiText: (prompt: string): Promise<string> => ipcRenderer.invoke('ai:text', prompt),
  aiImage: (prompt: string): Promise<GeneratedImage> => ipcRenderer.invoke('ai:image', prompt),
  // Phone remote
  getRemoteStatus: (): Promise<RemoteServerStatus> => ipcRenderer.invoke('remote:status'),
  setRemoteEnabled: (enabled: boolean): Promise<RemoteServerStatus> =>
    ipcRenderer.invoke('remote:setEnabled', enabled),
  newRemotePin: (): Promise<RemoteServerStatus> => ipcRenderer.invoke('remote:newPin'),
  remoteQrCode: (url: string): Promise<string> => ipcRenderer.invoke('remote:qr', url),
  sendRemoteState: (state: RemoteState): void => ipcRenderer.send('remote:state', state),
  onRemoteCommand: (callback: (command: RemoteCommand) => void): (() => void) => {
    const listener = (_evt: Electron.IpcRendererEvent, command: RemoteCommand): void =>
      callback(command)
    ipcRenderer.on('remote:command', listener)
    return () => ipcRenderer.removeListener('remote:command', listener)
  },
  /** Called when the user chose "Save and close" in the window's close prompt. */
  onSaveAndCloseRequest: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('app:saveAndClose', listener)
    return () => ipcRenderer.removeListener('app:saveAndClose', listener)
  }
}

export type MovieNightApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
