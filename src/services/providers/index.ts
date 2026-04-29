import type { ImageProvider, Vendor } from './types'
import { geminiProvider } from './gemini'
import { openaiProvider } from './openai'

export type { ImageProvider, GenerationResult, Vendor, ModelOption } from './types'

const providers: Record<Vendor, ImageProvider> = {
  gemini: geminiProvider,
  openai: openaiProvider,
}

export const getProvider = (vendor: Vendor): ImageProvider => providers[vendor]
