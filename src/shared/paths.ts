import type { MediaKind } from './types'

const MEDIA_SUBDIR: Record<MediaKind, string> = {
  video: 'videos',
  audio: 'audio',
  image: 'images'
}

export function mediaRelPath(kind: MediaKind, fileName: string): string {
  return `media/${MEDIA_SUBDIR[kind]}/${fileName}`
}

/** Converts an absolute filesystem path (POSIX or Windows) into a `file://` URL usable in <video>/<img>/<audio> src. */
export function toFileUrl(absPath: string): string {
  let normalized = absPath.replace(/\\/g, '/')
  if (!normalized.startsWith('/')) normalized = '/' + normalized
  // Keep a Windows drive letter segment (e.g. "C:") unescaped; encode every other segment.
  const segments = normalized
    .split('/')
    .map((seg, i) => (i === 1 && /^[A-Za-z]:$/.test(seg) ? seg : encodeURIComponent(seg)))
  return 'file://' + segments.join('/')
}

export function mediaFileUrl(projectDir: string, kind: MediaKind, fileName: string): string {
  const dir = projectDir.replace(/\\/g, '/').replace(/\/$/, '')
  return toFileUrl(`${dir}/${mediaRelPath(kind, fileName)}`)
}
