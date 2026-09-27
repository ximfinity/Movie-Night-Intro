import { app } from 'electron'
import { join, basename, extname } from 'path'
import fs from 'fs/promises'
import { createReadStream, existsSync } from 'fs'
import { createHash, randomUUID } from 'crypto'
import type {
  ImportedMediaFile,
  MediaKind,
  TemplateInsertResult,
  TemplateSummary
} from '../shared/types'
import { mediaRelPath } from '../shared/paths'

/** Slide-group templates live in the app's user-data folder (not in any project), so every
 * project can use them. Each template is a folder holding template.json plus copies of the
 * media its slides use, so it keeps working after the original project is gone. */
const TEMPLATE_FILE = 'template.json'

interface StoredTemplate {
  formatVersion: 1
  id: string
  name: string
  createdAt: string
  item: Record<string, unknown>
}

interface MediaUse {
  kind: MediaKind
  fileName: string
}

function templatesRoot(): string {
  return join(app.getPath('userData'), 'templates')
}

function templateDir(id: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid template id')
  return join(templatesRoot(), id)
}

function isPlainFileName(name: unknown): name is string {
  return typeof name === 'string' && name !== '' && !/[\\/]/.test(name) && basename(name) === name
}

/** Media files a (raw) slide group refers to: slide images and its music/pop-up video. */
function mediaUsedBy(item: Record<string, unknown>): MediaUse[] {
  const uses: MediaUse[] = []
  const frames = Array.isArray(item.frames) ? item.frames : []
  for (const f of frames) {
    const bg = (f as Record<string, unknown>)?.backgroundImage
    if (isPlainFileName(bg)) uses.push({ kind: 'image', fileName: bg })
  }
  const music = item.music as Record<string, unknown> | null | undefined
  if (music && isPlainFileName(music.fileName)) {
    uses.push({ kind: music.kind === 'video' ? 'video' : 'audio', fileName: music.fileName })
  }
  const seen = new Set<string>()
  return uses.filter((u) => {
    const k = `${u.kind}:${u.fileName}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function hashFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha1')
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')))
  })
}

async function sameContent(a: string, b: string): Promise<boolean> {
  const [sa, sb] = await Promise.all([fs.stat(a), fs.stat(b)])
  if (sa.size !== sb.size) return false
  const [ha, hb] = await Promise.all([hashFile(a), hashFile(b)])
  return ha === hb
}

async function uniqueName(dir: string, fileName: string): Promise<string> {
  const ext = extname(fileName)
  const base = basename(fileName, ext)
  let candidate = fileName
  for (let n = 1; existsSync(join(dir, candidate)); n++) candidate = `${base}-${n}${ext}`
  return candidate
}

async function readTemplate(id: string): Promise<StoredTemplate | null> {
  try {
    const raw = JSON.parse(await fs.readFile(join(templateDir(id), TEMPLATE_FILE), 'utf-8'))
    if (!raw || typeof raw !== 'object' || !raw.item || typeof raw.item !== 'object') return null
    return raw as StoredTemplate
  } catch {
    return null
  }
}

function summarize(t: StoredTemplate): TemplateSummary {
  const frames = Array.isArray(t.item.frames) ? (t.item.frames as Record<string, unknown>[]) : []
  const music = t.item.music as Record<string, unknown> | null | undefined
  return {
    id: t.id,
    name: t.name,
    createdAt: t.createdAt,
    slideCount: frames.length,
    sampleTitles: frames
      .map((f) => (typeof f.title === 'string' ? f.title.trim() : ''))
      .filter(Boolean)
      .slice(0, 3),
    musicName: music && typeof music.displayName === 'string' ? music.displayName : null
  }
}

export async function listTemplates(): Promise<TemplateSummary[]> {
  if (!existsSync(templatesRoot())) return []
  const ids = await fs.readdir(templatesRoot())
  const templates = await Promise.all(
    ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).map((id) => readTemplate(id))
  )
  return templates
    .filter((t): t is StoredTemplate => t !== null)
    .map(summarize)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Saves a slide group, plus copies of the media it uses, as a new template. Media files
 * missing from the project are left out (their slides simply show without them). */
export async function saveTemplate(
  projectDir: string,
  name: string,
  item: Record<string, unknown>
): Promise<{ template: TemplateSummary; missing: string[] }> {
  const id = randomUUID()
  const dir = templateDir(id)
  const missing: string[] = []
  for (const use of mediaUsedBy(item)) {
    const src = join(projectDir, mediaRelPath(use.kind, use.fileName))
    if (!existsSync(src)) {
      missing.push(use.fileName)
      continue
    }
    const dest = join(dir, mediaRelPath(use.kind, use.fileName))
    await fs.mkdir(join(dest, '..'), { recursive: true })
    await fs.copyFile(src, dest)
  }
  const stored: StoredTemplate = {
    formatVersion: 1,
    id,
    name: name.trim() || 'Untitled template',
    createdAt: new Date().toISOString(),
    item
  }
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(join(dir, TEMPLATE_FILE), JSON.stringify(stored, null, 2), 'utf-8')
  return { template: summarize(stored), missing }
}

/** Copies a template's media into a project (reusing identical files already there,
 * renaming on a clash) and returns the slide group with file names pointing at the copies. */
export async function insertTemplate(
  id: string,
  projectDir: string
): Promise<TemplateInsertResult> {
  const stored = await readTemplate(id)
  if (!stored) throw new Error('That template could not be read.')
  const item = structuredClone(stored.item)
  const renamed = new Map<string, string>()
  const media: TemplateInsertResult['media'] = []

  for (const use of mediaUsedBy(item)) {
    const src = join(templateDir(id), mediaRelPath(use.kind, use.fileName))
    if (!existsSync(src)) continue
    const destDir = join(projectDir, mediaRelPath(use.kind, ''))
    await fs.mkdir(destDir, { recursive: true })
    let destName = use.fileName
    const existing = join(destDir, destName)
    if (!existsSync(existing) || !(await sameContent(src, existing))) {
      if (existsSync(existing)) destName = await uniqueName(destDir, use.fileName)
      await fs.copyFile(src, join(destDir, destName))
    }
    renamed.set(`${use.kind}:${use.fileName}`, destName)
    const file: ImportedMediaFile = { fileName: destName, displayName: use.fileName }
    media.push({ kind: use.kind, file })
  }

  const frames = Array.isArray(item.frames) ? (item.frames as Record<string, unknown>[]) : []
  for (const f of frames) {
    const next = renamed.get(`image:${f.backgroundImage}`)
    if (next) f.backgroundImage = next
  }
  const music = item.music as Record<string, unknown> | null | undefined
  if (music) {
    const kind = music.kind === 'video' ? 'video' : 'audio'
    const next = renamed.get(`${kind}:${music.fileName}`)
    if (next) music.fileName = next
  }
  return { item, media }
}

export async function deleteTemplate(id: string): Promise<void> {
  await fs.rm(templateDir(id), { recursive: true, force: true })
}
