import { describe, expect, it } from 'vitest'
import { collectMediaRefs, normalizeProject } from './projectFormat'
import type { SlideshowItem, VideoItem } from './types'

describe('normalizeProject', () => {
  it('rejects JSON that is not a project', () => {
    expect(() => normalizeProject({ name: 'not-a-project', version: '1.0.0' })).toThrow(
      /isn't a Movie Night project/
    )
    expect(() => normalizeProject(null)).toThrow()
    expect(() => normalizeProject([1, 2])).toThrow()
  })

  it('fills defaults for a minimal project', () => {
    const p = normalizeProject({ items: [] })
    expect(p.formatVersion).toBe(5)
    expect(p.feature.source).toBe('none')
    expect(p.feature.holdMessage).toBe('The movie will be starting shortly')
    expect(p.library).toEqual({ videos: [], audio: [], images: [] })
    expect(p.aiPrompt).toEqual({ event: '', tone: 'silly and punny', perTitle: 5 })
    expect(p.countdown.mode).toBe('clock')
  })

  it('migrates the old single-slide format into a one-slide group', () => {
    const p = normalizeProject({
      items: [
        {
          id: 's1',
          type: 'slide',
          title: 'Welcome',
          subtitle: 'Grab a seat',
          theme: 'popcorn',
          music: { fileName: 'song.mp3', displayName: 'Song' }
        }
      ]
    })
    const item = p.items[0] as SlideshowItem
    expect(item.type).toBe('slideshow')
    expect(item.name).toBe('')
    expect(item.frames).toHaveLength(1)
    expect(item.frames[0].title).toBe('Welcome')
    expect(item.frames[0].subtitleOptions).toEqual(['Grab a seat'])
    expect(item.music?.kind).toBe('audio')
    expect(item.music?.loopSlidesUntilEnd).toBe(false)
  })

  it('repairs bad values instead of crashing the show', () => {
    const p = normalizeProject({
      items: [
        { type: 'video', fileName: 'a.mp4', volume: 'loud' },
        { type: 'video' },
        { type: 'slideshow', id: 'g', frames: [] },
        { type: 'mystery' },
        { type: 'slideshow', id: 'h', frames: [{ id: 'x', durationSec: -5 }, { id: 'x' }] }
      ]
    })
    expect(p.items).toHaveLength(3)
    expect((p.items[0] as VideoItem).volume).toBe(1)
    expect((p.items[1] as SlideshowItem).frames).toHaveLength(1)
    const dup = p.items[2] as SlideshowItem
    expect(dup.frames[0].durationSec).toBe(1)
    expect(dup.frames[0].id).not.toBe(dup.frames[1].id)
  })

  it('repairs the feature settings and new slide fields', () => {
    const p = normalizeProject({
      items: [{ type: 'slideshow', frames: [{ bodyStyle: 'list', aiKind: 'trivia' }, {}] }],
      feature: {
        source: 'file',
        filePath: 'D:\\Movies\\Goonies.mkv',
        player: 'vlc',
        startMode: 'auto',
        holdSec: 9999,
        posterImage: '',
        holdMusicVolume: 2
      }
    })
    const frames = (p.items[0] as SlideshowItem).frames
    expect(frames[0].bodyStyle).toBe('list')
    expect(frames[0].aiKind).toBe('trivia')
    expect(frames[1].bodyStyle).toBe('rotate')
    expect(frames[1].aiKind).toBe('jokes')
    expect(p.feature).toMatchObject({
      source: 'file',
      filePath: 'D:\\Movies\\Goonies.mkv',
      player: 'builtin',
      startMode: 'auto',
      holdSec: 600,
      posterImage: null,
      holdMusicVolume: 1
    })
  })

  it('shows QR slides from older projects whole, and defaults other pictures to fill', () => {
    const p = normalizeProject({
      items: [
        {
          type: 'slideshow',
          frames: [
            { content: 'image', backgroundImage: 'donate-qr.png' },
            { content: 'image', backgroundImage: 'donate-qr-2.png', imageFit: 'fill' },
            { content: 'image', backgroundImage: 'poster.png' }
          ]
        }
      ]
    })
    expect((p.items[0] as SlideshowItem).frames.map((f) => f.imageFit)).toEqual([
      'fit',
      'fill',
      'fill'
    ])
  })

  it('drops music with no file and clamps music settings', () => {
    const p = normalizeProject({
      items: [
        { type: 'slideshow', frames: [{}], music: { kind: 'video' } },
        {
          type: 'slideshow',
          frames: [{}],
          music: { kind: 'video', fileName: 'v.mp4', volume: 3, sizeScale: 99 }
        }
      ]
    })
    expect((p.items[0] as SlideshowItem).music).toBeNull()
    const music = (p.items[1] as SlideshowItem).music!
    expect(music.volume).toBe(1)
    expect(music.sizeScale).toBe(10)
  })
})

describe('collectMediaRefs', () => {
  it('lists each referenced file once, from the library and from items', () => {
    const p = normalizeProject({
      items: [
        { type: 'video', fileName: 'clip.mp4' },
        {
          type: 'slideshow',
          frames: [{ backgroundImage: 'poster.png' }, { backgroundImage: 'poster.png' }],
          music: { kind: 'video', fileName: 'popup.mp4' }
        }
      ],
      library: { videos: [{ fileName: 'clip.mp4', displayName: 'Clip' }] },
      feature: { posterImage: 'goonies.jpg', holdMusic: 'lobby.mp3', introClip: 'thx.mp4' }
    })
    expect(
      collectMediaRefs(p)
        .map((r) => `${r.kind}:${r.fileName}`)
        .sort()
    ).toEqual([
      'audio:lobby.mp3',
      'image:goonies.jpg',
      'image:poster.png',
      'video:clip.mp4',
      'video:popup.mp4',
      'video:thx.mp4'
    ])
  })
})
