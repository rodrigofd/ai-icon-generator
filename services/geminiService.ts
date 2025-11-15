import { GoogleGenAI, Type, Modality } from "@google/genai";
import { IconStyle } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- New Color Collision Detection Logic ---

/**
 * Converts a hex color string to an RGB object.
 * @param hex The hex color string (e.g., "#RRGGBB").
 * @returns An object with r, g, b properties, or null if invalid.
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

/**
 * Calculates the Euclidean distance between two RGB colors.
 * @param rgb1 The first color object.
 * @param rgb2 The second color object.
 * @returns The numerical distance between the colors.
 */
const colorDistance = (rgb1: { r: number; g: number; b: number }, rgb2: { r: number; g: number; b: number }): number => {
  const rDiff = rgb1.r - rgb2.r;
  const gDiff = rgb1.g - rgb2.g;
  const bDiff = rgb1.b - rgb2.b;
  return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
};

const PRIMARY_MASK_COLOR_HEX = '#00b140';   // The original green screen
const SECONDARY_MASK_COLOR_HEX = '#0000FF'; // A pure blue fallback
const COLOR_DISTANCE_THRESHOLD = 120;      // How close colors can be before switching

/**
 * Selects a safe background color for generation that is unlikely to clash with the user's chosen color.
 * @param userColorHex The color the user selected for their icon. Can be undefined.
 * @returns A hex string for a safe background color to use in the prompt.
 */
export const getSafeMaskColor = (userColorHex?: string): string => {
  if (!userColorHex) {
    return PRIMARY_MASK_COLOR_HEX;
  }

  const userColorRgb = hexToRgb(userColorHex);
  if (!userColorRgb) {
    return PRIMARY_MASK_COLOR_HEX; // Default if user color is somehow invalid
  }

  const primaryMaskRgb = hexToRgb(PRIMARY_MASK_COLOR_HEX)!;
  if (colorDistance(userColorRgb, primaryMaskRgb) < COLOR_DISTANCE_THRESHOLD) {
    // User's color is too close to green, so switch to the blue fallback.
    return SECONDARY_MASK_COLOR_HEX;
  }

  return PRIMARY_MASK_COLOR_HEX; // Green is safe to use
};


export const getStyleDescription = (style: IconStyle, color?: string): string => {
  switch (style) {
    case IconStyle.FLAT_SINGLE_COLOR:
      return `A modern, flat design style icon. The icon must be a single solid shape, using only the color ${color}.`;
    case IconStyle.FLAT_COLORED:
      return `A modern, flat design style icon using a vibrant but simple color palette (2-3 colors max). Do not use gradients.`;
    case IconStyle.OUTLINE:
      return `A modern, minimalist line-art style icon. The icon must be composed of outlines only, using the color ${color}. The stroke width should be consistent and clean. The inside of the shape must be empty.`;
    case IconStyle.GRADIENT:
      return `A modern, flat design style icon using smooth, vibrant gradients.`;
    case IconStyle.ISOMETRIC:
      return `A modern, clean, isometric style icon.`;
    case IconStyle.THREE_D:
      return `A high-quality 3D rendered icon with a clean aesthetic, soft lighting, and subtle shadows.`;
    default:
      return color
        ? `A standard, modern icon style using the primary color ${color}.`
        : `A standard, modern icon style.`;
  }
};

const callGenerationApi = async (prompt: string, numVariants: number, referenceImageB64?: string) => {
  // FIX: Restructured `parts` array creation to allow TypeScript to correctly infer the union type
  // for elements, which can be either a text or an image part. The previous implementation
  // caused a type error when adding an image part to an array inferred to only contain text parts.
  const parts = referenceImageB64
    ? [
        {
          inlineData: {
            mimeType: 'image/png',
            data: referenceImageB64,
          },
        },
        { text: prompt },
      ]
    : [{ text: prompt }];

  const generationPromises = Array(numVariants).fill(0).map(() =>
    ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    })
  );

  const generationResponses = await Promise.all(generationPromises);

  const imagesWithGreenScreen = generationResponses.map(response => {
    const firstPart = response.candidates?.[0]?.content?.parts?.[0];
    if (firstPart && firstPart.inlineData) {
      return firstPart.inlineData.data;
    }
    return null;
  }).filter((b64): b64 is string => b64 !== null);

  if (imagesWithGreenScreen.length === 0) {
      throw new Error("No icons were generated. The model may have refused the prompt.");
  }
  
  return imagesWithGreenScreen;
};


export const generateIcons = async (generationPrompt: string, numVariants: number): Promise<string[]> => {
  try {
    return await callGenerationApi(generationPrompt, numVariants);
  } catch (error) {
    console.error("Error generating icons:", error);
    throw new Error("Failed to generate icons from the API.");
  }
};

export const generateReferencedIcon = async (
  generationPrompt: string,
  numVariants: number,
  referenceImageB64: string
): Promise<string[]> => {
  try {
    return await callGenerationApi(generationPrompt, numVariants, referenceImageB64);
  } catch (error) {
    console.error("Error generating referenced icon:", error);
    throw new Error("Failed to generate referenced icon from the API.");
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
      },
    });

    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;

    if (!base64ImageBytes) {
      throw new Error("No image was generated. The model may have refused the prompt.");
    }
    
    return base64ImageBytes;

  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate image from the API.");
  }
};

export const editImage = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
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
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }

    throw new Error("No edited image was returned from the model.");

  } catch (error) {
    console.error("Error editing image:", error);
    throw new Error("Failed to edit image using the API.");
  }
};