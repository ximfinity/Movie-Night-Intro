import { ipcMain } from 'electron'
import { join } from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import QRCode from 'qrcode'
import { PNG } from 'pngjs'
import type { ImportedMediaFile } from '../shared/types'
import { mediaRelPath } from '../shared/paths'

const WIDTH = 1920
const HEIGHT = 1080
/** Side of the white card the code sits on; leaves a wide margin so a 16:10 screen that
 * crops the sides a little never cuts into it. */
const CARD = 820
const QUIET_MODULES = 3

type Rgb = [number, number, number]

function fillRect(png: PNG, x: number, y: number, w: number, h: number, [r, g, b]: Rgb): void {
  for (let yy = Math.max(0, y); yy < Math.min(png.height, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(png.width, x + w); xx++) {
      const i = (yy * png.width + xx) * 4
      png.data[i] = r
      png.data[i + 1] = g
      png.data[i + 2] = b
      png.data[i + 3] = 255
    }
  }
}

/** A full-screen slide image of a QR code for `url` (e.g. a donation page): dark theater
 * red around a gold-edged white card, sized for a 1920×1080 image slide. */
export function renderQrSlide(url: string): Buffer {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' })
  const n = qr.modules.size
  const png = new PNG({ width: WIDTH, height: HEIGHT })
  // Background: vertical gradient, deep red to near-black.
  for (let y = 0; y < HEIGHT; y++) {
    const t = y / HEIGHT
    fillRect(png, 0, y, WIDTH, 1, [
      Math.round(94 - 58 * t),
      Math.round(12 - 8 * t),
      Math.round(24 - 17 * t)
    ])
  }
  const x0 = Math.round((WIDTH - CARD) / 2)
  const y0 = Math.round((HEIGHT - CARD) / 2)
  fillRect(png, x0 - 10, y0 - 10, CARD + 20, CARD + 20, [242, 184, 75])
  fillRect(png, x0, y0, CARD, CARD, [255, 255, 255])
  const cell = Math.floor(CARD / (n + QUIET_MODULES * 2))
  const offset = Math.round((CARD - cell * n) / 2)
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (qr.modules.get(row, col)) {
        fillRect(png, x0 + offset + col * cell, y0 + offset + row * cell, cell, cell, [17, 17, 17])
      }
    }
  }
  return PNG.sync.write(png)
}

export function registerQrHandlers(): void {
  ipcMain.handle(
    'media:makeQrSlide',
    async (_evt, projectDir: string, url: string): Promise<ImportedMediaFile> => {
      let parsed: URL
      try {
        parsed = new URL(String(url).trim())
      } catch {
        throw new Error("That link isn't a valid web address.")
      }
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('The link must start with https://')
      }
      const destDir = join(projectDir, mediaRelPath('image', ''))
      await fs.mkdir(destDir, { recursive: true })
      let fileName = 'donate-qr.png'
      for (let i = 1; existsSync(join(destDir, fileName)); i++) fileName = `donate-qr-${i}.png`
      await fs.writeFile(join(destDir, fileName), renderQrSlide(parsed.toString()))
      return { fileName, displayName: `QR code: ${parsed.hostname}` }
    }
  )
}
