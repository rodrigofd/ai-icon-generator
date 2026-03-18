import { GoogleGenAI, Modality } from '@google/genai'

const getAi = () =>
{
  const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY
  if (!API_KEY)
  {
    throw new Error('Gemini API key is not set. Please select an API key in the settings.')
  }
  return new GoogleGenAI({ apiKey: API_KEY })
}

// --- Color Collision Detection ---

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

/**
 * Selects a safe background color for generation that won't clash with the user's chosen color.
 */
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

// --- API calls ---

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

  const imagesWithGreenScreen = generationResponses
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

  if (imagesWithGreenScreen.length === 0)
  {
    throw new Error('No icons were generated. The model may have refused the prompt.')
  }

  return imagesWithGreenScreen
}

export const generateIcons = async (
  generationPrompt: string,
  numVariants: number,
  model: string,
): Promise<string[]> =>
{
  return callGenerationApi(generationPrompt, numVariants, model)
}

export const generateReferencedIcons = async (
  generationPrompt: string,
  numVariants: number,
  referenceImagesB64: string[],
  model: string,
): Promise<string[]> =>
{
  return callGenerationApi(generationPrompt, numVariants, model, referenceImagesB64)
}

export const editImage = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  model: string,
): Promise<string> =>
{
  const response = await getAi().models.generateContent({
    model: model,
    contents: {
      parts: [
        {
          inlineData: {
            data: base64ImageData,
            mimeType: mimeType,
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
    return firstPart.inlineData.data
  }

  throw new Error('No edited image was generated. The model may have refused the prompt.')
}
