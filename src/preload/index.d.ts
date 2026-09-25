import { ElectronAPI } from '@electron-toolkit/preload'
import type { MovieNightApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: MovieNightApi
  }
}
