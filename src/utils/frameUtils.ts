// Composite an icon (transparent-bg PNG) onto a rounded-square gradient tile,
// Android-launcher style. Corners outside the tile remain transparent.

export type FramePalette = 'auto' | 'light' | 'dark' | 'vibrant'

export interface FrameOptions
{
  palette?: FramePalette
  cornerRadiusFraction?: number   // tile corner radius as fraction of tile width; default 0.22
  tileMarginFraction?: number     // transparent margin around the tile, as fraction of canvas; default 0.04
  iconScale?: number              // icon size as fraction of tile; default 0.62
  noiseStrength?: number          // 0..1, amplitude of subtle texture; default 0.05
}

const clamp = (n: number, min = 0, max = 255): number => Math.max(min, Math.min(max, n))

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] =>
{
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  let h = 0
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))

  if (d !== 0)
  {
    switch (max)
    {
      case rn: h = ((gn - bn) / d) % 6; break
      case gn: h = (bn - rn) / d + 2; break
      case bn: h = (rn - gn) / d + 4; break
    }
    h *= 60
    if (h < 0) h += 360
  }
  return [h / 360, s, l]
}

const hslToRgb = (h: number, s: number, l: number): [number, number, number] =>
{
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = (h * 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r = 0, g = 0, b = 0
  if      (hp < 1) { r = c; g = x; b = 0 }
  else if (hp < 2) { r = x; g = c; b = 0 }
  else if (hp < 3) { r = 0; g = c; b = x }
  else if (hp < 4) { r = 0; g = x; b = c }
  else if (hp < 5) { r = x; g = 0; b = c }
  else             { r = c; g = 0; b = x }
  const m = l - c / 2
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ]
}

const hex = (h: number, s: number, l: number): string =>
{
  const [r, g, b] = hslToRgb(h, s, l)
  return `rgb(${r}, ${g}, ${b})`
}

interface IconStats
{
  hasIcon: boolean
  avgH: number    // 0..1
  avgS: number    // 0..1
  avgL: number    // 0..1
  isMono: boolean
  isDark: boolean
  isLight: boolean
}

interface IconAnalysis extends IconStats
{
  bbox: { x: number, y: number, w: number, h: number } | null
}

const analyzeIcon = (img: HTMLImageElement, w: number, h: number): IconAnalysis =>
{
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h).data

  // Pass 1: bounding box of non-transparent pixels + colour stats
  let minX = w, minY = h, maxX = -1, maxY = -1
  let r = 0, g = 0, b = 0, count = 0
  const ALPHA_THRESHOLD = 24

  for (let y = 0; y < h; y++)
  {
    const rowOffset = y * w * 4
    for (let x = 0; x < w; x++)
    {
      const i = rowOffset + x * 4
      const a = data[i + 3]
      if (a < ALPHA_THRESHOLD) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      // Sample every 4th pixel for color stats — fast & plenty
      if ((x & 3) === 0 && (y & 3) === 0)
      {
        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
        count++
      }
    }
  }

  if (count === 0 || maxX < 0)
  {
    return { hasIcon: false, avgH: 0, avgS: 0, avgL: 0.5, isMono: false, isDark: false, isLight: false, bbox: null }
  }
  r /= count; g /= count; b /= count
  const [H, S, L] = rgbToHsl(r, g, b)
  return {
    hasIcon: true,
    avgH: H,
    avgS: S,
    avgL: L,
    isMono: S < 0.18,
    isDark: L < 0.32,
    isLight: L > 0.7,
    bbox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
  }
}

interface PaletteResolved
{
  start: string
  end: string
  angleDeg: number   // gradient direction
}

const derivePalette = (stats: IconStats, mode: FramePalette): PaletteResolved =>
{
  // Default: a fallback if we couldn't sample anything sensible
  if (!stats.hasIcon)
  {
    return { start: hex(0.6, 0.15, 0.85), end: hex(0.6, 0.2, 0.7), angleDeg: 135 }
  }

  // Manual palette modes pick a fixed look, ignoring icon characteristics
  if (mode === 'light')
  {
    return { start: hex(stats.avgH, 0.18, 0.92), end: hex(stats.avgH, 0.22, 0.82), angleDeg: 135 }
  }
  if (mode === 'dark')
  {
    return { start: hex(stats.avgH, 0.4, 0.22), end: hex(stats.avgH, 0.55, 0.12), angleDeg: 135 }
  }
  if (mode === 'vibrant')
  {
    return { start: hex(stats.avgH, 0.7, 0.55), end: hex((stats.avgH + 0.08) % 1, 0.75, 0.4), angleDeg: 135 }
  }

  // Auto: pick a tile color/lightness that contrasts with the icon
  if (stats.isMono)
  {
    // Monochrome icon → vibrant complement-ish tile, light if icon dark, dark if icon light
    const tileH = (stats.avgH + 0.55) % 1
    if (stats.isDark)
    {
      return { start: hex(tileH, 0.55, 0.66), end: hex(tileH, 0.65, 0.5), angleDeg: 135 }
    }
    if (stats.isLight)
    {
      return { start: hex(tileH, 0.55, 0.32), end: hex(tileH, 0.7, 0.18), angleDeg: 135 }
    }
    return { start: hex(tileH, 0.5, 0.55), end: hex(tileH, 0.6, 0.4), angleDeg: 135 }
  }

  // Coloured icon → soft analogous pastel that doesn't fight the icon
  const tileH = (stats.avgH + 0.08) % 1
  const tileS = Math.min(stats.avgS * 0.55, 0.45)
  const baseL = stats.avgL > 0.55 ? 0.42 : 0.82
  return {
    start: hex(tileH, tileS, baseL),
    end:   hex(tileH, Math.min(tileS + 0.08, 0.55), Math.max(baseL - 0.14, 0.1)),
    angleDeg: 135,
  }
}

const drawRoundedRectPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) =>
{
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  ctx.lineTo(x + rr, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
  ctx.lineTo(x, y + rr)
  ctx.quadraticCurveTo(x, y, x + rr, y)
  ctx.closePath()
}

export const applyFrame = (dataUrl: string, opts: FrameOptions = {}): Promise<string> =>
{
  const {
    palette = 'auto',
    cornerRadiusFraction = 0.22,
    tileMarginFraction = 0.04,
    iconScale = 0.62,
    noiseStrength = 0.05,
  } = opts

  return new Promise((resolve, reject) =>
  {
    const img = new Image()
    img.onload = () =>
    {
      const W = img.width
      const H = img.height
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx)
      {
        reject(new Error('No 2D canvas context'))
        return
      }

      const stats = analyzeIcon(img, W, H)
      const pal = derivePalette(stats, palette)

      const margin = Math.round(Math.min(W, H) * tileMarginFraction)
      const tileX = margin
      const tileY = margin
      const tileW = W - margin * 2
      const tileH = H - margin * 2
      const radius = tileW * cornerRadiusFraction

      ctx.save()
      drawRoundedRectPath(ctx, tileX, tileY, tileW, tileH, radius)
      ctx.clip()

      // Linear gradient bg
      const angle = (pal.angleDeg * Math.PI) / 180
      const dx = Math.cos(angle) * tileW
      const dy = Math.sin(angle) * tileH
      const grad = ctx.createLinearGradient(
        tileX + tileW / 2 - dx / 2,
        tileY + tileH / 2 - dy / 2,
        tileX + tileW / 2 + dx / 2,
        tileY + tileH / 2 + dy / 2,
      )
      grad.addColorStop(0, pal.start)
      grad.addColorStop(1, pal.end)
      ctx.fillStyle = grad
      ctx.fillRect(tileX, tileY, tileW, tileH)

      // Subtle noise overlay (clipped to tile by the active path)
      if (noiseStrength > 0)
      {
        const nd = ctx.getImageData(tileX, tileY, tileW, tileH)
        const d = nd.data
        const amp = 255 * noiseStrength
        for (let i = 0; i < d.length; i += 4)
        {
          // Skip pixels the rounded-clip didn't fill (alpha === 0)
          if (d[i + 3] === 0) continue
          const n = (Math.random() - 0.5) * amp
          d[i]     = clamp(d[i] + n)
          d[i + 1] = clamp(d[i + 1] + n)
          d[i + 2] = clamp(d[i + 2] + n)
        }
        ctx.putImageData(nd, tileX, tileY)
      }

      // Crop to the icon's actual bounding box so it fills iconScale of the tile
      // regardless of how much padding the model baked into the canvas.
      const targetMax = Math.min(tileW, tileH) * iconScale
      let srcX = 0, srcY = 0, srcW = W, srcH = H
      if (stats.bbox)
      {
        srcX = stats.bbox.x
        srcY = stats.bbox.y
        srcW = stats.bbox.w
        srcH = stats.bbox.h
      }
      const aspect = srcW / srcH
      const drawW = aspect >= 1 ? targetMax : targetMax * aspect
      const drawH = aspect >= 1 ? targetMax / aspect : targetMax
      const iconX = tileX + (tileW - drawW) / 2
      const iconY = tileY + (tileH - drawH) / 2
      ctx.drawImage(img, srcX, srcY, srcW, srcH, iconX, iconY, drawW, drawH)

      ctx.restore()

      resolve(canvas.toDataURL('image/png'))
    }

    img.onerror = (err) => reject(new Error(`Failed to load image for framing: ${err}`))
    img.src = dataUrl
  })
}
