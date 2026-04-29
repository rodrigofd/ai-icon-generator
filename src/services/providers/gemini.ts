import { GoogleGenAI, Modality } from '@google/genai'
import type { ImageProvider, GenerationResult } from './types'

const getAi = () =>
{
  const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY
  if (!API_KEY)
  {
    throw new Error('Gemini API key is not set. Please set GEMINI_API_KEY in your environment.')
  }
  return new GoogleGenAI({ apiKey: API_KEY })
}

const callGenerationApi = async (
  prompt: string,
  numVariants: number,
  modelName: string,
  referenceImagesB64?: string[],
): Promise<string[]> =>
{
  const parts: any[] = []

  if (referenceImagesB64 && referenceImagesB64.length > 0)
  {
    referenceImagesB64.forEach(b64 =>
    {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: b64,
        },
      })
    })
  }

  parts.push({ text: prompt })

  const generationPromises = Array(numVariants).fill(0).map(() =>
    getAi().models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    }),
  )

  const generationResponses = await Promise.all(generationPromises)

  const images = generationResponses
    .map(response =>
    {
      const firstPart = response.candidates?.[0]?.content?.parts?.[0]
      if (firstPart && firstPart.inlineData)
      {
        return firstPart.inlineData.data
      }
      return null
    })
    .filter((b64): b64 is string => b64 !== null)

  if (images.length === 0)
  {
    throw new Error('No icons were generated. The model may have refused the prompt.')
  }

  return images
}

export const geminiProvider: ImageProvider = {
  async generateIcons(prompt, numVariants, model)
  {
    const images = await callGenerationApi(prompt, numVariants, model)
    return images.map(b64 => ({ base64Data: b64, nativeTransparency: false }))
  },

  async generateReferencedIcons(prompt, numVariants, referenceImagesB64, model)
  {
    const images = await callGenerationApi(prompt, numVariants, model, referenceImagesB64)
    return images.map(b64 => ({ base64Data: b64, nativeTransparency: false }))
  },

  async editImage(base64ImageData, mimeType, prompt, model)
  {
    const response = await getAi().models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    })

    const firstPart = response.candidates?.[0]?.content?.parts?.[0]
    if (firstPart && firstPart.inlineData && firstPart.inlineData.data)
    {
      return { base64Data: firstPart.inlineData.data, nativeTransparency: false }
    }

    throw new Error('No edited image was generated. The model may have refused the prompt.')
  },
}
