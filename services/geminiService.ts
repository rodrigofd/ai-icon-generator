import { GoogleGenAI, Type, Modality } from "@google/genai";
import { IconStyle } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const getStyleDescription = (style: IconStyle, color: string): string => {
  switch (style) {
    case IconStyle.FLAT_SINGLE_COLOR:
      return `A modern, flat design style icon. The icon must be a single solid shape, using only the color ${color}.`;
    case IconStyle.FLAT_COLORED:
      return `A modern, flat design style icon using a vibrant but simple color palette (2-3 colors max), with ${color} as the prominent, primary color. Do not use gradients.`;
    case IconStyle.OUTLINE:
      return `A modern, minimalist line-art style icon. The icon must be composed of outlines only, using the color ${color}. The stroke width should be consistent and clean. The inside of the shape must be empty.`;
    case IconStyle.GRADIENT:
      return `A modern, flat design style icon using smooth, vibrant gradients. The prominent color should be ${color}.`;
    case IconStyle.ISOMETRIC:
      return `A modern, clean, isometric style icon. The prominent color should be ${color}.`;
    case IconStyle.THREE_D:
      return `A high-quality 3D rendered icon with a clean aesthetic, soft lighting, and subtle shadows. The prominent color should be ${color}.`;
    default:
      return `A standard, modern icon style using the primary color ${color}.`;
  }
};

export const generateIcons = async (prompt: string, style: IconStyle, numVariants: number, isUiIcon: boolean, color: string): Promise<string[]> => {
  const styleDescription = getStyleDescription(style, color);
  const purposeDescription = isUiIcon
    ? "The icon must be simple, clear, and instantly recognizable for a user interface."
    : "This is a general-purpose icon.";

  const GREEN_SCREEN_COLOR = '#00b140';

  // Step 1: Prompt to generate icon on a solid green background for client-side processing.
  const generationPrompt = `Generate a single, high-resolution 512x512 icon of a "${prompt}".

**Style:** ${styleDescription}
**Purpose:** ${purposeDescription}
**Composition:** The icon must be a clean, visually distinct object, centered in the frame.
**Background:** The background must be a solid, plain, non-transparent green color (${GREEN_SCREEN_COLOR}). This is critical for post-processing. The icon artwork itself must not contain this specific shade of green.
**Negative Constraints:** Absolutely no text, letters, numbers, watermarks, or signatures.`;

  try {
    const generationPromises = Array(numVariants).fill(0).map(() =>
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: generationPrompt }],
        },
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

  } catch (error) {
    console.error("Error generating icons:", error);
    throw new Error("Failed to generate icons from the API.");
  }
};

// FIX: Add generateImage function to be used by ImageGenerator.tsx.
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

// FIX: Add editImage function to be used by ImageEditor.tsx.
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
