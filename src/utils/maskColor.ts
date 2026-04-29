const hexToRgb = (hex: string): { r: number; g: number; b: number } | null =>
{
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
    : null
}

const colorDistance = (
  rgb1: { r: number; g: number; b: number },
  rgb2: { r: number; g: number; b: number },
): number =>
{
  const rDiff = rgb1.r - rgb2.r
  const gDiff = rgb1.g - rgb2.g
  const bDiff = rgb1.b - rgb2.b
  return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff)
}

const PRIMARY_MASK_COLOR_HEX = '#00b140'
const SECONDARY_MASK_COLOR_HEX = '#0000FF'
const COLOR_DISTANCE_THRESHOLD = 120

export const getSafeMaskColor = (userColorHex?: string): string =>
{
  if (!userColorHex)
  {
    return PRIMARY_MASK_COLOR_HEX
  }

  const userColorRgb = hexToRgb(userColorHex)
  if (!userColorRgb)
  {
    return PRIMARY_MASK_COLOR_HEX
  }

  const primaryMaskRgb = hexToRgb(PRIMARY_MASK_COLOR_HEX)!
  if (colorDistance(userColorRgb, primaryMaskRgb) < COLOR_DISTANCE_THRESHOLD)
  {
    return SECONDARY_MASK_COLOR_HEX
  }

  return PRIMARY_MASK_COLOR_HEX
}
