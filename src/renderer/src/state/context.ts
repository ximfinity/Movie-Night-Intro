import { createContext } from 'react'
import type {
  AiPromptSettings,
  CountdownConfig,
  FeatureConfig,
  ImportedMediaFile,
  MediaKind,
  MediaRef,
  MovieSource,
  MovieStartMode,
  PlaylistItem,
  ProjectData,
  SlideFrame,
  SlideFrameContent
} from '@shared/types'
import type { SectionId, ShowDetails, ThemeNightId } from '@shared/builtinTemplates'

/** Sentinel selectedItemId value meaning "the countdown overlay settings are selected"
 * (the countdown is a project-level setting, not a playlist item). */
export const COUNTDOWN_SELECTION_ID = '__countdown__'

/** Sentinel selectedItemId value for the feature presentation (movie + showtime) settings. */
export const FEATURE_SELECTION_ID = '__feature__'

/** One slide's worth of an imported AI reply: add `lines` to slide `frameId`, or create a
 * new slide titled `title` when frameId is absent. */
export interface SubtitlePlanEntry {
  frameId?: string
  title: string
  lines: string[]
}

/** Everything the New Show wizard collected. */
export interface WizardPlan {
  theme: ThemeNightId
  sections: SectionId[]
  details: ShowDetails
  /** "HH:mm" */
  showtime: string
  /** PTA fundraiser: becomes a QR-code slide. */
  donationUrl: string
  movie: { source: MovieSource; filePath: string; streamUrl: string }
  startMode: MovieStartMode
}

export interface ProjectState {
  dir: string | null
  /** The JSON file this project was opened from (saves go back to it). */
  fileName: string
  project: ProjectData | null
  /** The project exactly as last saved or loaded; there are unsaved changes whenever the
   * current project is a different object (so undoing back to it clears "unsaved"). */
  savedProject: ProjectData | null
  selectedItemId: string | null
  /** In-memory clipboard for reusing a slide frame across slideshow items; never saved. */
  copiedFrame: SlideFrame | null
  /** Media files the open project refers to that couldn't be found on disk, detected on
   * open; never saved. Cleared when the banner showing them is dismissed. */
  missingMedia: MediaRef[]
  /** Undo/redo history of whole-project snapshots (cheap: edits are immutable updates). */
  past: ProjectData[]
  future: ProjectData[]
  /** Lets rapid edits to the same field (typing, dragging a slider) share one undo step. */
  lastEdit: { key: string | null; at: number }
  /** Shown as a blocking overlay while a slow operation (copying media) runs. */
  busyMessage: string | null
  /** A one-off tip shown at the top of the editor (e.g. after the wizard); never saved. */
  notice: string | null
}

export interface ProjectContextValue {
  dir: string | null
  project: ProjectData | null
  selectedItemId: string | null
  copiedFrame: SlideFrame | null
  missingMedia: MediaRef[]
  busyMessage: string | null
  notice: string | null
  dirty: boolean
  canUndo: boolean
  canRedo: boolean
  startNewProject: () => Promise<void>
  /** Builds a whole show from the wizard's answers in a folder the user picks. Resolves
   * true once it's open in the editor. */
  createShowFromWizard: (plan: WizardPlan) => Promise<boolean>
  dismissNotice: () => void
  openProject: () => Promise<void>
  /** Resolves true once the project is safely on disk; shows the error and resolves false
   * otherwise. */
  saveProject: () => Promise<boolean>
  closeProject: () => void
  undo: () => void
  redo: () => void
  /** Inserts after the selected item (or appends) and selects the new item. */
  addItem: (item: PlaylistItem) => void
  updateItem: (id: string, patch: Partial<PlaylistItem>) => void
  removeItem: (id: string) => void
  duplicateItem: (id: string) => void
  reorderItems: (fromIndex: number, toIndex: number) => void
  selectItem: (id: string | null) => void
  updateCountdown: (patch: Partial<CountdownConfig>) => void
  updateFeature: (patch: Partial<FeatureConfig>) => void
  importToLibrary: (kind: MediaKind) => Promise<ImportedMediaFile[]>
  removeFromLibrary: (kind: MediaKind, fileName: string) => void
  /** Appends a slide in the group's current look; returns its id. */
  addFrame: (itemId: string, content?: SlideFrameContent) => string
  updateFrame: (itemId: string, frameId: string, patch: Partial<SlideFrame>) => void
  removeFrame: (itemId: string, frameId: string) => void
  reorderFrames: (itemId: string, fromIndex: number, toIndex: number) => void
  /** Copies one slide's theme, animation and duration onto every slide in its group. */
  applyStyleToGroup: (itemId: string, frameId: string) => void
  /** Duplicates the frame in place within its own group, and stores a copy in the
   * clipboard so it can also be pasted into a different slideshow item. Returns the
   * duplicate's id. */
  copyFrame: (itemId: string, frameId: string) => string | null
  /** Appends the clipboard slide to a group; returns its id. */
  pasteFrame: (itemId: string) => string | null
  dismissMissingMedia: () => void
  /** Applies a reviewed subtitle import as one undo step; returns ids of new slides. */
  applySubtitlePlan: (itemId: string, plan: SubtitlePlanEntry[]) => string[]
  updateAiPrompt: (patch: Partial<AiPromptSettings>) => void
  /** Copies the project and its media to a new folder and continues working there. */
  saveProjectAs: () => Promise<boolean>
  /** Saves a slide group (and copies of its media) to the shared template library. */
  saveGroupAsTemplate: (itemId: string, name: string) => Promise<boolean>
  /** Adds a template's slide group after the selected item, copying its media in. */
  insertTemplate: (templateId: string) => Promise<boolean>
}

export const ProjectContext = createContext<ProjectContextValue | null>(null)
