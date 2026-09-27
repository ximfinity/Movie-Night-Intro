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
