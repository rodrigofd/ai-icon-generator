import express from 'express';
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
app.use(express.json({ limit: '10mb' }) as any); // Support base64 image data in requests

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

const getSafeMaskColor = (userColorHex?: string): string => {
  if (!userColorHex) return PRIMARY_MASK_COLOR_HEX;
  const userColorRgb = hexToRgb(userColorHex);
  if (!userColorRgb) return PRIMARY_MASK_COLOR_HEX;
  const primaryMaskRgb = hexToRgb(PRIMARY_MASK_COLOR_HEX)!;
  return colorDistance(userColorRgb, primaryMaskRgb) < COLOR_DISTANCE_THRESHOLD ? SECONDARY_MASK_COLOR_HEX : PRIMARY_MASK_COLOR_HEX;
};

const getStyleDescription = (style: IconStyle, color?: string): string => {
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
      - Aesthetic: Modern UI aesthetic, glassmorphism hints, vibrant.`;
    case IconStyle.ISOMETRIC:
      return `Style: Isometric 3D View.
      - Perspective: Orthographic isometric.
      - Visuals: Clean 3D geometry, soft shading.
      - Object: Single floating element.`;
    case IconStyle.THREE_D:
      return `Style: 3D Clay Render.
      - Material: Matte plastic or clay.
      - Lighting: Soft studio lighting.
      - Aesthetics: Cute, rounded, 3D styling.`;
    default:
      return color
        ? `Style: Standard Vector Icon. Color: ${color}.`
        : `Style: Standard Vector Icon.`;
  }
};

const generateFullPrompt = (promptForIcon: string, style: IconStyle, color: string, isUiIcon: boolean, padding: number): string => {
    const is3D = style === IconStyle.THREE_D || style === IconStyle.ISOMETRIC;
    const maskColor = getSafeMaskColor((style === IconStyle.FLAT_SINGLE_COLOR || style === IconStyle.OUTLINE) ? color : undefined);
    const styleDescription = getStyleDescription(style, (style === IconStyle.FLAT_SINGLE_COLOR || style === IconStyle.OUTLINE) ? color : undefined);
    
    const paddingInstruction = padding > 0 ? "Constraint: Ensure distinct separation from the canvas edges (fit within safe zone)." : "Constraint: Fit effectively within the frame.";

    if (is3D) {
        // 3D STRATEGY: "Object Only"
        const entityType = style === IconStyle.ISOMETRIC ? "Isometric 3D Object" : "3D Rendered Object";
        
        return `Role: Expert 3D Modeler.
Task: Render a single, isolated ${entityType} based on: "${promptForIcon}".

Subject: "${promptForIcon}" as a tangible 3D object.
CRITICAL INSTRUCTION: Generate the object completely ISOLATED in the void. 
Do NOT render it inside a "container", "card", "bubble", "button", "badge", or "app icon shape".
Just the raw object floating in space.
${styleDescription}
${paddingInstruction}
Composition: Centered, single isolated object.

BACKGROUND:
1. The background must be a SINGLE, FLAT, UNIFORM COLOR: ${maskColor}.
2. It must be a solid hex color for chroma keying.
3. NO gradients. NO shadows on the background. NO floor. NO ground plane.
4. NO "icon background" shape behind the object.

Negative Prompt: icon container, icon background, app icon shape, rounded square, squircle, circle background, card, tile, badge, button, ui element, border, frame, vignette, noise, floor, ground, shadow, gradient background.`;

    } else {
        // 2D STRATEGY: "Icon Designer"
        const complexityInstruction = isUiIcon 
            ? "Complexity: LOW. Create a High-Contrast, Simple, Legible icon. Avoid small details. Readable at 24px." 
            : "Complexity: Medium. Professional icon detail level.";

        return `Role: Senior Icon Designer.
Task: Create a professional 512x512 vector-style icon.
IMPORTANT: Generate the ISOLATED OBJECT only. Do not generate an app icon button or container.

Subject: "${promptForIcon}"
${styleDescription}
${complexityInstruction}
${paddingInstruction}
Composition: Centered, single isolated object.

Background: SOLID ${maskColor}. 
CRITICAL: The background is a chroma-key mask.
The icon must be a free-floating object.
Do NOT render a background shape, card, tile, or "app icon" squircle behind the object.

Negative Prompt: text, watermark, signature, frame, border, margin, bounding box, card, container, background shape, rounded square, squircle, app icon base, launcher icon, platform, podium, stage, floor, photorealistic, noise, grainy, blurry, landscape.`;
    }
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

const callGenerationApi = async (prompt: string, numVariants: number, model: string): Promise<string[]> => {
    const generationPromises = Array(numVariants).fill(0).map(() =>
        ai.models.generateContent({
            model: model,
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

app.post('/generate', async (req: any, res: any) => {
    try {
        const {
            prompt,
            style = IconStyle.FLAT_SINGLE_COLOR,
            color = '#000000',
            numVariants = 1,
            isUiIcon = true,
            padding = 0,
            model = 'gemini-2.5-flash-image' // Default to flash if not provided
        } = req.body;

        if (!prompt || !style || !color || numVariants < 1) {
            return res.status(400).json({ error: 'Missing or invalid required parameters: prompt, style, color, numVariants.' });
        }

        const fullPrompt = generateFullPrompt(prompt, style, color, isUiIcon, padding);
        const generatedImages = await callGenerationApi(fullPrompt, numVariants, model);
        
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