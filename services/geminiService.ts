
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
    default:
      return `A standard, modern icon style using the primary color ${color}.`;
  }
};

export const generateIcons = async (prompt: string, style: IconStyle, numVariants: number, isUiIcon: boolean, color: string): Promise<string[]> => {
  const styleDescription = getStyleDescription(style, color);
  const purposeDescription = isUiIcon
    ? "The icon must be simple, clear, and instantly recognizable for a user interface."
    : "This is a general-purpose icon.";

  // Step 1: Prompt to generate icon on a solid background for easier processing.
  const generationPrompt = `Generate a single, high-resolution 512x512 icon of a "${prompt}".

**Style:** ${styleDescription}
**Purpose:** ${purposeDescription}
**Composition:** The icon must be a clean, visually distinct object, centered in the frame.
**Background:** The background must be a solid, plain, non-transparent white color (#FFFFFF). This is critical for post-processing.
**Negative Constraints:** Absolutely no text, letters, numbers, watermarks, or signatures.`;

  try {
    // Step 1: Generate icons with a solid white background.
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

    const imagesWithBackground = generationResponses.map(response => {
      const firstPart = response.candidates?.[0]?.content?.parts?.[0];
      if (firstPart && firstPart.inlineData) {
        return firstPart.inlineData.data;
      }
      return null;
    }).filter((b64): b64 is string => b64 !== null);

    if (imagesWithBackground.length === 0) {
        throw new Error("No icons were generated during the initial step. The model may have refused the prompt.");
    }
    
    // Step 2: Prompt to remove the background.
    const removalPrompt = "Remove the solid white background from this icon, making the background completely transparent. The icon artwork itself should remain perfectly intact and unchanged. Output a PNG with a true alpha channel.";

    // Step 2: Remove the background from each generated icon.
    const removalPromises = imagesWithBackground.map(base64Image =>
        ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: base64Image, mimeType: 'image/png' } },
                    { text: removalPrompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        })
    );

    const removalResponses = await Promise.all(removalPromises);

    const finalImagesB64 = removalResponses.map(response => {
      const firstPart = response.candidates?.[0]?.content?.parts?.[0];
      if (firstPart && firstPart.inlineData) {
        return firstPart.inlineData.data;
      }
      return null;
    }).filter((b64): b64 is string => b64 !== null);

    if (finalImagesB64.length === 0) {
        throw new Error("Background removal failed for all generated icons.");
    }
    
    return finalImagesB64;

  } catch (error) {
    console.error("Error generating icons:", error);
    throw new Error("Failed to generate icons from the API.");
  }
};

export const editImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                    { text: prompt },
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
        throw new Error("No image data found in API response.");
    } catch (error) {
        console.error("Error editing image:", error);
        throw new Error("Failed to edit image with the API.");
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
                aspectRatio: '1:1',
            },
        });
        
        const generatedImage = response.generatedImages[0];
        if (generatedImage?.image?.imageBytes) {
            return generatedImage.image.imageBytes;
        }
        throw new Error("No image data found in API response.");
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate image with the API.");
    }
};
