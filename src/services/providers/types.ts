export type Vendor = 'gemini' | 'openai'

export type Quality = 'low' | 'medium' | 'high'

export interface GenerationResult
{
  base64Data: string
  nativeTransparency: boolean
}

export interface ImageProvider
{
  generateIcons(
    prompt: string,
    numVariants: number,
    model: string,
    quality?: Quality,
  ): Promise<GenerationResult[]>

  generateReferencedIcons(
    prompt: string,
    numVariants: number,
    referenceImagesB64: string[],
    model: string,
    quality?: Quality,
  ): Promise<GenerationResult[]>

  editImage(
    base64ImageData: string,
    mimeType: string,
    prompt: string,
    model: string,
    quality?: Quality,
  ): Promise<GenerationResult>
}

export interface ModelOption
{
  id: string
  label: string
  vendor: Vendor
  supportsTransparency: boolean
}

export const VENDORS_WITH_QUALITY: ReadonlySet<Vendor> = new Set(['openai'])
