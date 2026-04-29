import type { ImageProvider, GenerationResult } from './types'
import { AVAILABLE_MODELS, DEFAULT_QUALITY } from '../../constants'

const modelSupportsTransparency = (modelId: string): boolean =>
{
  const model = AVAILABLE_MODELS.find(m => m.id === modelId)
  return model?.supportsTransparency ?? false
}

const apiRequest = async <T>(url: string, body: Record<string, unknown>): Promise<T> =>
{
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok)
  {
    const errorData = await response.json().catch(() => ({}))
    const message = (errorData as any)?.error || `OpenAI proxy returned ${response.status}`
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
  }

  return response.json() as Promise<T>
}

export const openaiProvider: ImageProvider = {
  async generateIcons(prompt, numVariants, model, quality = DEFAULT_QUALITY)
  {
    const transparent = modelSupportsTransparency(model)

    const data = await apiRequest<{ images: string[] }>('/api/openai/generate', {
      prompt,
      n: numVariants,
      model,
      size: '1024x1024',
      quality,
      background: transparent ? 'transparent' : 'auto',
      outputFormat: 'png',
    })

    if (!data.images || data.images.length === 0)
    {
      throw new Error('No icons were generated. The model may have refused the prompt.')
    }

    return data.images.map(b64 => ({
      base64Data: b64,
      nativeTransparency: transparent,
    }))
  },

  async generateReferencedIcons(prompt, numVariants, referenceImagesB64, model, quality = DEFAULT_QUALITY)
  {
    const transparent = modelSupportsTransparency(model)

    const data = await apiRequest<{ images: string[] }>('/api/openai/edit', {
      prompt,
      n: numVariants,
      model,
      images: referenceImagesB64,
      size: '1024x1024',
      quality,
      background: transparent ? 'transparent' : 'auto',
    })

    if (!data.images || data.images.length === 0)
    {
      throw new Error('No icons were generated. The model may have refused the prompt.')
    }

    return data.images.map(b64 => ({
      base64Data: b64,
      nativeTransparency: transparent,
    }))
  },

  async editImage(base64ImageData, _mimeType, prompt, model, quality = DEFAULT_QUALITY)
  {
    const transparent = modelSupportsTransparency(model)

    const data = await apiRequest<{ images: string[] }>('/api/openai/edit', {
      prompt,
      n: 1,
      model,
      images: [base64ImageData],
      size: '1024x1024',
      quality,
      background: transparent ? 'transparent' : 'auto',
    })

    if (!data.images || data.images.length === 0)
    {
      throw new Error('No edited image was generated. The model may have refused the prompt.')
    }

    return {
      base64Data: data.images[0],
      nativeTransparency: transparent,
    }
  },
}
