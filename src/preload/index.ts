import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  ImportedMediaFile,
  MediaKind,
  MediaRef,
  NewProjectChoice,
  OpenProjectResult,
  ProjectData
} from '../shared/types'

const api = {
  selectNewProjectFolder: (): Promise<NewProjectChoice | null> =>
    ipcRenderer.invoke('project:selectNewFolder'),
  openExistingProject: (): Promise<OpenProjectResult | null> =>
    ipcRenderer.invoke('project:openExisting'),
  saveProject: (dir: string, fileName: string, project: ProjectData): Promise<void> =>
    ipcRenderer.invoke('project:save', dir, fileName, project),
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
  setDirty: (flag: boolean): void => ipcRenderer.send('app:setDirty', flag),
  closeWindow: (): void => ipcRenderer.send('app:closeWindow'),
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
