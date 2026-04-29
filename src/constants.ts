import { IconStyle } from './types'
import type { ModelOption, Quality, Vendor } from './services/providers/types'

export const STYLE_OPTIONS = [
  { id: IconStyle.FLAT_SINGLE_COLOR, label: 'Monochrome', imageUrl: './assets/style-flat.png' },
  { id: IconStyle.FLAT_COLORED, label: 'Flat (colored)', imageUrl: './assets/style-colored.png' },
  { id: IconStyle.OUTLINE, label: 'Outline', imageUrl: './assets/style-outline.png' },
  { id: IconStyle.GRADIENT, label: 'Gradient', imageUrl: './assets/style-gradient.png' },
  { id: IconStyle.ISOMETRIC, label: 'Isometric', imageUrl: './assets/style-isometric.png' },
  { id: IconStyle.THREE_D, label: '3D Render', imageUrl: './assets/style-3d-render.png' },
] as const

export const VARIANT_OPTIONS = [1, 2, 4, 8] as const

export const MODEL_STORAGE_KEY = 'settings_selected_model'
const LEGACY_MODEL_STORAGE_KEY = 'settings_gemini_model'

export const AVAILABLE_MODELS: ModelOption[] = [
  // OpenAI
  { id: 'gpt-image-2', label: 'GPT Image 2 ($$) Latest', vendor: 'openai', supportsTransparency: false },
  { id: 'gpt-image-1', label: 'GPT Image 1 ($$$) + Transparency', vendor: 'openai', supportsTransparency: true },
  // Gemini
  { id: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash ($$) HQ', vendor: 'gemini', supportsTransparency: false },
  { id: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro ($$$$) HQ', vendor: 'gemini', supportsTransparency: false },
  { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash ($)', vendor: 'gemini', supportsTransparency: false },
]

export const VENDOR_LABELS: Record<Vendor, string> = {
  openai: 'OpenAI',
  gemini: 'Google Gemini',
}

export const getModelOption = (modelId: string): ModelOption | undefined =>
  AVAILABLE_MODELS.find(m => m.id === modelId)

export const getStoredModelId = (): string =>
{
  const stored = localStorage.getItem(MODEL_STORAGE_KEY)
  if (stored && AVAILABLE_MODELS.some(m => m.id === stored))
  {
    return stored
  }

  const legacy = localStorage.getItem(LEGACY_MODEL_STORAGE_KEY)
  if (legacy && AVAILABLE_MODELS.some(m => m.id === legacy))
  {
    localStorage.setItem(MODEL_STORAGE_KEY, legacy)
    localStorage.removeItem(LEGACY_MODEL_STORAGE_KEY)
    return legacy
  }

  return AVAILABLE_MODELS[0].id
}

export const QUALITY_STORAGE_KEY = 'settings_quality'

export const QUALITY_OPTIONS: { id: Quality, label: string }[] = [
  { id: 'low', label: 'Low (faster)' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High (slower)' },
]

export const DEFAULT_QUALITY: Quality = 'low'

export const getStoredQuality = (): Quality =>
{
  const stored = localStorage.getItem(QUALITY_STORAGE_KEY) as Quality | null
  if (stored && QUALITY_OPTIONS.some(q => q.id === stored))
  {
    return stored
  }
  return DEFAULT_QUALITY
}

export const DEFAULT_PROMPT = 'A rocket ship launching'
export const DEFAULT_COLOR = '#000000'
export const DEFAULT_PADDING = 16
export const DEFAULT_NUM_VARIANTS = 2
