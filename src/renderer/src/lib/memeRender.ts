import type { MemeCaption } from '@shared/memes'

/** Memes are rendered at slide resolution so they fill the screen like any image slide. */
export const MEME_WIDTH = 1920
export const MEME_HEIGHT = 1080

const FONT_STACK = 'Impact, Haettenschweiler, "Arial Narrow Bold", "Arial Black", sans-serif'
/** Kept clear of the edges so projector overscan can't clip the captions (meme slides are
 * shown whole, not cropped or zoomed). */
const MARGIN_X = 96
const MARGIN_Y = 56
const MAX_TEXT_WIDTH = MEME_WIDTH - MARGIN_X * 2
const MAX_LINES = 2
const MIN_SIZE = 56

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("That picture couldn't be opened."))
    img.src = src
  })
}

function drawScaled(ctx: CanvasRenderingContext2D, img: HTMLImageElement, contain: boolean): void {
  const scale = (contain ? Math.min : Math.max)(
    MEME_WIDTH / img.naturalWidth,
    MEME_HEIGHT / img.naturalHeight
  )
  const w = img.naturalWidth * scale
  const h = img.naturalHeight * scale
  ctx.drawImage(img, (MEME_WIDTH - w) / 2, (MEME_HEIGHT - h) / 2, w, h)
}

/** The picture layer: the image fitted inside a blurred, darkened copy of itself (so any
 * shape fills 16:9), or a plain backdrop. Expensive (a full-size blur), so it's rendered
 * once per picture and reused while the captions are edited. */
export function renderPictureLayer(img: HTMLImageElement | null): HTMLCanvasElement {
  const layer = document.createElement('canvas')
  layer.width = MEME_WIDTH
  layer.height = MEME_HEIGHT
  const ctx = layer.getContext('2d')!
  ctx.fillStyle = '#12070a'
  ctx.fillRect(0, 0, MEME_WIDTH, MEME_HEIGHT)
  if (img) {
    ctx.save()
    ctx.filter = 'blur(40px) brightness(0.5)'
    drawScaled(ctx, img, false)
    ctx.restore()
    drawScaled(ctx, img, true)
  } else {
    const g = ctx.createRadialGradient(960, 540, 80, 960, 540, 1100)
    g.addColorStop(0, '#5e0c18')
    g.addColorStop(1, '#12070a')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, MEME_WIDTH, MEME_HEIGHT)
  }
  return layer
}

function wrap(ctx: CanvasRenderingContext2D, words: string[]): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (!line || ctx.measureText(next).width <= MAX_TEXT_WIDTH) line = next
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Word-wraps into at most MAX_LINES lines, shrinking the font until it fits. A caption too
 * long even at the smallest size keeps its first lines and ends with "…". */
export function fitCaption(
  ctx: CanvasRenderingContext2D,
  text: string
): { lines: string[]; size: number } {
  const words = text.split(/\s+/).filter(Boolean)
  for (let size = 132; size >= MIN_SIZE; size -= 4) {
    ctx.font = `${size}px ${FONT_STACK}`
    const lines = wrap(ctx, words)
    if (
      lines.length <= MAX_LINES &&
      lines.every((l) => ctx.measureText(l).width <= MAX_TEXT_WIDTH)
    ) {
      return { lines, size }
    }
  }
  ctx.font = `${MIN_SIZE}px ${FONT_STACK}`
  const lines = wrap(ctx, words).slice(0, MAX_LINES)
  let last = lines[lines.length - 1] ?? ''
  while (last.includes(' ') && ctx.measureText(`${last}…`).width > MAX_TEXT_WIDTH) {
    last = last.slice(0, last.lastIndexOf(' '))
  }
  lines[lines.length - 1] = `${last}…`
  return { lines, size: MIN_SIZE }
}

function drawCaption(ctx: CanvasRenderingContext2D, text: string, where: 'top' | 'bottom'): void {
  const clean = text.trim().toUpperCase()
  if (!clean) return
  const { lines, size } = fitCaption(ctx, clean)
  const lineHeight = size * 1.05
  ctx.font = `${size}px ${FONT_STACK}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(6, size * 0.14)
  ctx.strokeStyle = '#000'
  ctx.fillStyle = '#fff'
  const blockHeight = lineHeight * lines.length
  const y0 = where === 'top' ? MARGIN_Y : MEME_HEIGHT - MARGIN_Y - blockHeight
  lines.forEach((line, i) => {
    const y = y0 + i * lineHeight
    // maxWidth squeezes a single unbreakable word instead of letting it run off the edge.
    ctx.strokeText(line, MEME_WIDTH / 2, y, MAX_TEXT_WIDTH)
    ctx.fillText(line, MEME_WIDTH / 2, y, MAX_TEXT_WIDTH)
  })
}

/** Draws a meme: the (pre-rendered) picture layer with the captions on top. */
export function drawMeme(
  canvas: HTMLCanvasElement,
  pictureLayer: HTMLCanvasElement,
  caption: MemeCaption
): void {
  // Setting width/height reallocates the canvas, so only do it once.
  if (canvas.width !== MEME_WIDTH) canvas.width = MEME_WIDTH
  if (canvas.height !== MEME_HEIGHT) canvas.height = MEME_HEIGHT
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(pictureLayer, 0, 0)
  drawCaption(ctx, caption.top, 'top')
  drawCaption(ctx, caption.bottom, 'bottom')
}
