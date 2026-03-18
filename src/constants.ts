import { IconStyle } from './types'

export const STYLE_OPTIONS = [
  { id: IconStyle.FLAT_SINGLE_COLOR, label: 'Monochrome', imageUrl: './assets/style-flat.png' },
  { id: IconStyle.FLAT_COLORED, label: 'Flat (colored)', imageUrl: './assets/style-colored.png' },
  { id: IconStyle.OUTLINE, label: 'Outline', imageUrl: './assets/style-outline.png' },
  { id: IconStyle.GRADIENT, label: 'Gradient', imageUrl: './assets/style-gradient.png' },
  { id: IconStyle.ISOMETRIC, label: 'Isometric', imageUrl: './assets/style-isometric.png' },
  { id: IconStyle.THREE_D, label: '3D Render', imageUrl: './assets/style-3d-render.png' },
] as const

export const VARIANT_OPTIONS = [1, 2, 4, 8] as const

export const MODEL_STORAGE_KEY = 'settings_gemini_model'

export const AVAILABLE_MODELS = [
  { id: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Image ($$) HQ (Nano Banana 2)' },
  { id: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image ($$$$) HQ (Nano Banana Pro)' },
  { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image ($) (Nano Banana)' },
] as const

export const DEFAULT_PROMPT = 'A rocket ship launching'
export const DEFAULT_COLOR = '#000000'
export const DEFAULT_PADDING = 16
export const DEFAULT_NUM_VARIANTS = 2
