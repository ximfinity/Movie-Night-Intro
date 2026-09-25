import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  ImportedMediaFile,
  MediaKind,
  MediaRef,
  OpenProjectResult,
  ProjectData
} from '../shared/types'

const api = {
  selectNewProjectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('project:selectNewFolder'),
  openExistingProject: (): Promise<OpenProjectResult | null> =>
    ipcRenderer.invoke('project:openExisting'),
  saveProject: (dir: string, project: ProjectData): Promise<void> =>
    ipcRenderer.invoke('project:save', dir, project),
  importMedia: (dir: string, kind: MediaKind): Promise<ImportedMediaFile[]> =>
    ipcRenderer.invoke('media:import', dir, kind),
  checkMediaExists: (dir: string, refs: MediaRef[]): Promise<MediaRef[]> =>
    ipcRenderer.invoke('media:checkExists', dir, refs),
  setFullscreen: (flag: boolean): Promise<void> => ipcRenderer.invoke('app:setFullscreen', flag)
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
