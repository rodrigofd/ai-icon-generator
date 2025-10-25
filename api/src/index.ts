import express, { Request, Response } from 'express';
import { GoogleGenAI, Modality } from "@google/genai";
import sharp from 'sharp';
import { IconStyle } from './types';
// FIX: Import Buffer to resolve type errors in Node.js environment.
import { Buffer } from 'buffer';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// --- Environment Setup ---
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });
const app = express();
app.use(express.json({ limit: '10mb' })); // Support base64 image data in requests

// --- Color & Style Logic (Replicated from Frontend) ---

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
};

const colorDistance = (rgb1: { r: number; g: number; b: number }, rgb2: { r: number; g: number; b: number }): number => {
  return Math.sqrt(Math.pow(rgb1.r - rgb2.r, 2) + Math.pow(rgb1.g - rgb2.g, 2) + Math.pow(rgb1.b - rgb2.b, 2));
};

const PRIMARY_MASK_COLOR_HEX = '#00b140';
const SECONDARY_MASK_COLOR_HEX = '#0000FF';
const COLOR_DISTANCE_THRESHOLD = 120;

const getSafeMaskColor = (userColorHex: string): string => {
  const userColorRgb = hexToRgb(userColorHex);
  if (!userColorRgb) return PRIMARY_MASK_COLOR_HEX;
  const primaryMaskRgb = hexToRgb(PRIMARY_MASK_COLOR_HEX)!;
  return colorDistance(userColorRgb, primaryMaskRgb) < COLOR_DISTANCE_THRESHOLD ? SECONDARY_MASK_COLOR_HEX : PRIMARY_MASK_COLOR_HEX;
};

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

const generateFullPrompt = (prompt: string, style: IconStyle, color: string, isUiIcon: boolean, padding: number): string => {
    const styleDescription = getStyleDescription(style, color);
    const purposeDescription = isUiIcon
      ? "The icon must be simple, clear, and instantly recognizable for a user interface."
      : "This is a general-purpose icon.";
    const maskColor = getSafeMaskColor(color);
    const paddingInstruction = padding > 0 ? "The icon artwork must be drawn to the absolute edges of the 512x512 frame, with no internal padding or margin. It should touch all four sides of the canvas." : "";

    return `Generate a single, high-resolution 512x512 icon of a "${prompt}".

**Style:** ${styleDescription}
**Purpose:** ${purposeDescription}
**Composition:** The icon must be a clean, visually distinct object, centered in the frame. ${paddingInstruction}
**Background:** The background must be a solid, plain, non-transparent color (${maskColor}). This is critical for post-processing. The icon artwork itself must not contain this specific shade of color.
**Negative Constraints:** Absolutely no text, letters, numbers, watermarks, or signatures.`;
}

// --- Server-Side Image Processing using Sharp ---

const removeGreenScreenNode = async (base64Image: string, tolerance: number = 25): Promise<string> => {
    const imageBuffer = Buffer.from(base64Image, 'base64');
    
    const { data: pixelBuffer, info } = await sharp(imageBuffer)
        .ensureAlpha() // Ensure image has an alpha channel
        .raw()
        .toBuffer({ resolveWithObject: true });

    // Dynamically sample the top-left pixel to determine the background color.
    const bgR = pixelBuffer[0];
    const bgG = pixelBuffer[1];
    const bgB = pixelBuffer[2];
    const bgRgb = { r: bgR, g: bgG, b: bgB };

    // Iterate through pixels and make matching ones transparent
    for (let i = 0; i < pixelBuffer.length; i += info.channels) {
        const r = pixelBuffer[i];
        const g = pixelBuffer[i + 1];
        const b = pixelBuffer[i + 2];

        if (colorDistance({ r, g, b }, bgRgb) < tolerance) {
            pixelBuffer[i + 3] = 0; // Set alpha to 0 (transparent)
        }
    }

    const finalBuffer = await sharp(pixelBuffer, { raw: { width: info.width, height: info.height, channels: info.channels } })
        .png()
        .toBuffer();

    return finalBuffer.toString('base64');
};

const addPaddingNode = async (base64Image: string, padding: number): Promise<string> => {
    if (padding <= 0) return base64Image;

    const imageBuffer = Buffer.from(base64Image, 'base64');
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
        throw new Error('Could not read image dimensions for padding.');
    }
    
    const newWidth = metadata.width - padding * 2;
    const newHeight = metadata.height - padding * 2;

    if (newWidth <= 0 || newHeight <= 0) {
        // Padding is too large, return a fully transparent image of the original size
        const transparentBuffer = await sharp({ create: { width: metadata.width, height: metadata.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
        return transparentBuffer.toString('base64');
    }

    const resizedIconBuffer = await image.resize(newWidth, newHeight).toBuffer();

    // Create a new transparent canvas and composite the resized icon onto it
    const finalBuffer = await sharp({ create: { width: metadata.width, height: metadata.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([{ input: resizedIconBuffer, top: padding, left: padding }])
        .png()
        .toBuffer();
        
    return finalBuffer.toString('base64');
};

// --- API Generation Logic ---

const callGenerationApi = async (prompt: string, numVariants: number): Promise<string[]> => {
    const generationPromises = Array(numVariants).fill(0).map(() =>
        ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        })
    );
    const responses = await Promise.all(generationPromises);
    
    const imagesB64 = responses.map(response => {
        const part = response.candidates?.[0]?.content?.parts?.[0];
        return (part && part.inlineData) ? part.inlineData.data : null;
    }).filter((b64): b64 is string => b64 !== null);

    if (imagesB64.length === 0) {
        throw new Error("No icons were generated by the model.");
    }
    return imagesB64;
};

// --- Express API Endpoint ---

app.post('/generate', async (req: Request, res: Response) => {
    try {
        const {
            prompt,
            style = IconStyle.FLAT_SINGLE_COLOR,
            color = '#000000',
            numVariants = 1,
            isUiIcon = true,
            padding = 0
        } = req.body;

        if (!prompt || !style || !color || numVariants < 1) {
            return res.status(400).json({ error: 'Missing or invalid required parameters: prompt, style, color, numVariants.' });
        }

        const fullPrompt = generateFullPrompt(prompt, style, color, isUiIcon, padding);
        const generatedImages = await callGenerationApi(fullPrompt, numVariants);
        
        const tolerance = style === IconStyle.FLAT_SINGLE_COLOR ? 50 : 25;

        const processedImages = await Promise.all(generatedImages.map(async (b64) => {
            const transparentB64 = await removeGreenScreenNode(b64, tolerance);
            return addPaddingNode(transparentB64, padding);
        }));

        const responsePayload = {
            icons: processedImages.map(b64 => ({
                base64: b64,
                dataUrl: `data:image/png;base64,${b64}`
            }))
        };
        
        res.status(200).json(responsePayload);

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'An internal error occurred while generating icons.' });
    }
});

// --- Server Start ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Icon generation API listening on port ${PORT}`);
});