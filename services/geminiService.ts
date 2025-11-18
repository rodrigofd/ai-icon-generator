import { GoogleGenAI, Modality } from "@google/genai";
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
      return `Style: Flat Vector Glyph.
      - Visuals: Solid shapes, no outlines, no gradients, no shadows.
      - Aesthetic: Minimalist, symbolic, clean silhouette.
      - Color: Use strictly ${color} for the icon shape.`;
    case IconStyle.FLAT_COLORED:
      return `Style: Flat Vector Illustration.
      - Visuals: geometric shapes, flat colors.
      - Aesthetic: Corporate art style, modern, clean.
      - Palette: Vibrant but limited (2-3 colors). No gradients.`;
    case IconStyle.OUTLINE:
      return `Style: Monoline Icon.
      - Visuals: Line art only, consistent stroke width (approx 4px).
      - Aesthetic: Minimalist, technical, blueprint feel.
      - Color: Lines must be ${color}. Background inside the shape should be transparent (or match the mask).`;
    case IconStyle.GRADIENT:
      return `Style: Modern Gradient Icon.
      - Visuals: Soft rounded shapes with smooth, trendy gradients.
      - Aesthetic: iOS App Icon style, glassmorphism hints, vibrant.`;
    case IconStyle.ISOMETRIC:
      return `Style: Isometric 3D Icon.
      - View: Orthographic isometric view.
      - Visuals: Sharp geometric edges, precise angles.
      - Aesthetic: Tech startup illustration style.`;
    case IconStyle.THREE_D:
      return `Style: 3D Rendered Icon.
      - Visuals: Claymorphism, soft lighting, matte materials.
      - Aesthetic: High-end 3D design, cute, rounded edges, toy-like.`;
    default:
      return color
        ? `Style: Standard Vector Icon. Color: ${color}.`
        : `Style: Standard Vector Icon.`;
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

// FIX: Added generateImage function to generate photorealistic images.
export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png', // The component expects png
          aspectRatio: '1:1',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      return response.generatedImages[0].image.imageBytes;
    }
    
    throw new Error("No image was generated. The model may have refused the prompt.");

  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate image from the API.");
  }
};

// FIX: Added editImage function to edit images based on a prompt.
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

        const firstPart = response.candidates?.[0]?.content?.parts?.[0];
        if (firstPart && firstPart.inlineData) {
            return firstPart.inlineData.data;
        }

        throw new Error("No edited image was generated. The model may have refused the prompt.");

    } catch (error) {
        console.error("Error editing image:", error);
        throw new Error("Failed to edit image from the API.");
    }
};