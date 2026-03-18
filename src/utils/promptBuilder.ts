import { IconStyle } from '../types'
import { getSafeMaskColor } from '../services/geminiService'

export const getStyleDescription = (style: IconStyle, color?: string): string =>
{
  switch (style)
  {
    case IconStyle.FLAT_SINGLE_COLOR:
      return `Style: Flat Vector Glyph.
      - Visuals: Solid shapes, no outlines, no gradients, no shadows.
      - Aesthetic: Minimalist, symbolic, clean silhouette.
      - Color: Use strictly ${color} for the icon shape.`
    case IconStyle.FLAT_COLORED:
      return `Style: Flat Vector Illustration.
      - Visuals: geometric shapes, flat colors.
      - Aesthetic: Corporate art style, modern, clean.
      - Palette: Vibrant but limited (2-3 colors). No gradients.`
    case IconStyle.OUTLINE:
      return `Style: Monoline Icon.
      - Visuals: Line art only, consistent stroke width (approx 4px).
      - Aesthetic: Minimalist, technical, blueprint feel.
      - Color: Lines must be ${color}. Background inside the shape should match the mask color.`
    case IconStyle.GRADIENT:
      return `Style: Modern Gradient Icon.
      - Visuals: Soft rounded shapes with smooth, trendy gradients.
      - Aesthetic: Modern UI aesthetic, glassmorphism hints, vibrant.`
    case IconStyle.ISOMETRIC:
      return `Style: Isometric 3D View.
      - Perspective: Orthographic isometric.
      - Visuals: Clean 3D geometry, soft shading.
      - Object: Single floating element.`
    case IconStyle.THREE_D:
      return `Style: 3D Clay Render.
      - Material: Matte plastic or clay.
      - Lighting: Soft studio lighting.
      - Aesthetics: Cute, rounded, 3D styling.`
    default:
      return color
        ? `Style: Standard Vector Icon. Color: ${color}.`
        : `Style: Standard Vector Icon.`
  }
}

export const isSingleColorStyle = (style: IconStyle): boolean =>
  style === IconStyle.FLAT_SINGLE_COLOR || style === IconStyle.OUTLINE

export const is3DStyle = (style: IconStyle): boolean =>
  style === IconStyle.THREE_D || style === IconStyle.ISOMETRIC

export interface PromptBuilderParams
{
  style: IconStyle
  color: string
  isUiIcon: boolean
  padding: number
  referenceMode?: 'edit' | 'inspire' | null
  referencePrompt?: string
  hasExternalRefs: boolean
}

export const buildFullPrompt = (
  promptText: string,
  params: PromptBuilderParams,
): string =>
{
  const singleColor = isSingleColorStyle(params.style)
  const is3D = is3DStyle(params.style)
  const maskColor = getSafeMaskColor(singleColor ? params.color : undefined)
  const styleDescription = getStyleDescription(params.style, singleColor ? params.color : undefined)

  const paddingInstruction = params.padding > 0
    ? `Constraint: Ensure distinct separation from the canvas edges (i.e. with a padding of approx. ${params.padding}px).`
    : 'Constraint: Fit effectively within the frame.'

  let systemPreamble = ''
  let backgroundInstruction = ''
  let negativePrompt = ''
  let mainSubject = ''

  if (is3D)
  {
    const entityType = params.style === IconStyle.ISOMETRIC ? 'Isometric 3D Object' : '3D Rendered Object'
    systemPreamble = `Role: Expert 3D Modeler. Task: Render a single, isolated ${entityType} based on: "${promptText}".`
    mainSubject = `Subject: "${promptText}" as a tangible 3D object. CRITICAL INSTRUCTION: Generate the object completely ISOLATED in the void.`
    backgroundInstruction = `BACKGROUND: SINGLE, FLAT, UNIFORM COLOR: ${maskColor}. NO gradients. NO shadows on the background.`
    negativePrompt = `Negative Prompt: icon container, icon background, app icon shape, rounded square, squircle, circle background, card, tile, badge, button, ui element, border, frame, vignette, noise, floor, ground, shadow, gradient background.`
  }
  else
  {
    const complexityInstruction = params.isUiIcon
      ? 'Complexity: LOW. Create a High-Contrast, Simple, Legible icon. Avoid small details. Readable at 24px.'
      : 'Complexity: Medium. Professional icon detail level.'
    systemPreamble = `Role: Senior Icon Designer. Task: Create a professional 512x512 vector-style icon. IMPORTANT: Generate the ISOLATED OBJECT only.`
    mainSubject = `Subject: "${promptText}" ${complexityInstruction}`
    backgroundInstruction = `Background: SOLID ${maskColor}. CRITICAL: The background is a chroma-key mask.`
    negativePrompt = `Negative Prompt: text, watermark, signature, frame, border, margin, bounding box, card, container, background shape, rounded square, squircle, app icon base, launcher icon, platform, podium, stage, floor, photorealistic, noise, grainy, blurry, landscape.`
  }

  // Reference-based generation
  if (params.hasExternalRefs || params.referenceMode === 'inspire')
  {
    return `${systemPreamble} Mode: INSPIRATION. Task: Create a NEW ${is3D ? 'asset' : 'icon'} for: "${promptText}". Constraint: Strictly copy the artistic style, lighting, and rendering technique of the provided reference image(s). ${backgroundInstruction} ${negativePrompt}`
  }

  if (params.referenceMode === 'edit' && params.referencePrompt)
  {
    return `${systemPreamble} Mode: EDITING. Original Description: "${params.referencePrompt}" User Instruction: "${promptText}" Constraint: Apply the instruction while preserving the original's exact style, perspective, and composition. ${styleDescription} ${backgroundInstruction} ${negativePrompt}`
  }

  return `${systemPreamble} ${mainSubject} ${styleDescription} ${paddingInstruction} Composition: Centered, single isolated object. ${backgroundInstruction} ${negativePrompt}`
}
