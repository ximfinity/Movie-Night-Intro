import type { MemeCaption } from '@shared/memes'

/** Memes are rendered at slide resolution so they fill the screen like any image slide. */
export const MEME_WIDTH = 1920
export const MEME_HEIGHT = 1080

const FONT_STACK = 'Impact, Haettenschweiler, "Arial Narrow Bold", "Arial Black", sans-serif'
const MARGIN = 48
const MAX_TEXT_WIDTH = MEME_WIDTH - MARGIN * 2
const MAX_LINES = 2

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("That picture couldn't be opened."))
    img.src = src
  })
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, contain: boolean): void {
  const scale = (contain ? Math.min : Math.max)(
    MEME_WIDTH / img.naturalWidth,
    MEME_HEIGHT / img.naturalHeight
  )
  const w = img.naturalWidth * scale
  const h = img.naturalHeight * scale
  ctx.drawImage(img, (MEME_WIDTH - w) / 2, (MEME_HEIGHT - h) / 2, w, h)
}

/** Greedy word wrap into at most MAX_LINES lines, shrinking the font until it fits. */
function fitText(ctx: CanvasRenderingContext2D, text: string): { lines: string[]; size: number } {
  const words = text.split(/\s+/).filter(Boolean)
  for (let size = 132; size >= 56; size -= 4) {
    ctx.font = `${size}px ${FONT_STACK}`
    const lines: string[] = []
    let line = ''
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      if (ctx.measureText(next).width <= MAX_TEXT_WIDTH || !line) line = next
      else {
        lines.push(line)
        line = word
      }
    }
    if (line) lines.push(line)
    const fits = lines.every((l) => ctx.measureText(l).width <= MAX_TEXT_WIDTH)
    if (lines.length <= MAX_LINES && fits) return { lines, size }
  }
  ctx.font = `56px ${FONT_STACK}`
  return { lines: [text], size: 56 }
}

function drawCaption(ctx: CanvasRenderingContext2D, text: string, where: 'top' | 'bottom'): void {
  const clean = text.trim().toUpperCase()
  if (!clean) return
  const { lines, size } = fitText(ctx, clean)
  const lineHeight = size * 1.05
  ctx.font = `${size}px ${FONT_STACK}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(6, size * 0.14)
  ctx.strokeStyle = '#000'
  ctx.fillStyle = '#fff'
  const blockHeight = lineHeight * lines.length
  const y0 = where === 'top' ? MARGIN : MEME_HEIGHT - MARGIN - blockHeight
  lines.forEach((line, i) => {
    const y = y0 + i * lineHeight
    ctx.strokeText(line, MEME_WIDTH / 2, y)
    ctx.fillText(line, MEME_WIDTH / 2, y)
  })
}

/** Draws a meme: the picture fitted inside a blurred, darkened copy of itself (so any shape
 * fills a 16:9 screen), with the captions on top. */
export function drawMeme(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement | null,
  caption: MemeCaption
): void {
  canvas.width = MEME_WIDTH
  canvas.height = MEME_HEIGHT
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#12070a'
  ctx.fillRect(0, 0, MEME_WIDTH, MEME_HEIGHT)
  if (img) {
    ctx.save()
    ctx.filter = 'blur(40px) brightness(0.5)'
    drawCover(ctx, img, false)
    ctx.restore()
    drawCover(ctx, img, true)
  } else {
    const g = ctx.createRadialGradient(960, 540, 80, 960, 540, 1100)
    g.addColorStop(0, '#5e0c18')
    g.addColorStop(1, '#12070a')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, MEME_WIDTH, MEME_HEIGHT)
  }
  drawCaption(ctx, caption.top, 'top')
  drawCaption(ctx, caption.bottom, 'bottom')
}
