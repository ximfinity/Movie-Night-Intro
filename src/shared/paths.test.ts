import { describe, expect, it } from 'vitest'
import { cssUrl, mediaFileUrl, toFileUrl } from './paths'

describe('toFileUrl', () => {
  it('keeps a Windows drive letter and encodes each segment', () => {
    expect(toFileUrl('C:\\Users\\Pat\\Movie Night\\poster.png')).toBe(
      'file:///C:/Users/Pat/Movie%20Night/poster.png'
    )
  })

  it('handles POSIX paths', () => {
    expect(toFileUrl('/home/pat/show/a#b.mp4')).toBe('file:///home/pat/show/a%23b.mp4')
  })
})

describe('mediaFileUrl', () => {
  it('points into the media subfolder for the kind', () => {
    expect(mediaFileUrl('C:\\Shows\\Friday\\', 'audio', 'intro song.mp3')).toBe(
      'file:///C:/Shows/Friday/media/audio/intro%20song.mp3'
    )
  })
})

describe('cssUrl', () => {
  it('quotes the URL so parentheses in file names stay valid CSS', () => {
    const url = mediaFileUrl('/shows/a', 'image', 'poster (1).png')
    expect(cssUrl(url)).toBe('url("file:///shows/a/media/images/poster%20(1).png")')
  })

  it('escapes double quotes', () => {
    expect(cssUrl('file:///x/"a".png')).toBe('url("file:///x/%22a%22.png")')
  })
})
