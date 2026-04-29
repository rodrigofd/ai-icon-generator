import { IconStyle } from '../types'
import type { Vendor } from '../services/providers/types'
import { getSafeMaskColor } from './maskColor'

export const isSingleColorStyle = (style: IconStyle): boolean =>
  style === IconStyle.FLAT_SINGLE_COLOR || style === IconStyle.OUTLINE

export const is3DStyle = (style: IconStyle): boolean =>
  style === IconStyle.THREE_D || style === IconStyle.ISOMETRIC

export interface PromptBuilderParams
{
  vendor: Vendor
  style: IconStyle
  color: string
  isUiIcon: boolean
  padding: number
  referenceMode?: 'edit' | 'inspire' | null
  referencePrompt?: string
  hasExternalRefs: boolean
  useTransparentBackground?: boolean
  framed?: boolean
}

interface BuildContext
{
  promptText: string
  params: PromptBuilderParams
  is3D: boolean
  singleColor: boolean
  useTransparent: boolean
  maskColor: string
}

const buildContext = (promptText: string, params: PromptBuilderParams): BuildContext =>
{
  const singleColor = isSingleColorStyle(params.style)
  return {
    promptText,
    params,
    is3D: is3DStyle(params.style),
    singleColor,
    useTransparent: params.useTransparentBackground ?? false,
    maskColor: getSafeMaskColor(singleColor ? params.color : undefined),
  }
}

// ---------- OpenAI: labeled segments, inline negatives, anywhere-positioned constraints ----------

const openaiStyleLine = (style: IconStyle, color?: string): string =>
{
  switch (style)
  {
    case IconStyle.FLAT_SINGLE_COLOR:
      return `Style: flat vector glyph. Solid filled shape, no outlines, no gradients, no shadows. Strictly use ${color} for the icon shape.`
    case IconStyle.FLAT_COLORED:
      return `Style: flat vector illustration. Geometric shapes painted in 2-3 vibrant flat colors. No gradients, no shadows, no outlines.`
    case IconStyle.OUTLINE:
      return `Style: monoline icon. Line art only with consistent ~4px stroke width. All lines in ${color}, no fills.`
    case IconStyle.GRADIENT:
      return `Style: modern gradient icon. Soft rounded shapes with smooth, trendy gradients. Modern UI aesthetic with subtle glassmorphism.`
    case IconStyle.ISOMETRIC:
      return `Style: isometric 3D object. Orthographic isometric perspective, clean 3D geometry, soft shading. Single floating element.`
    case IconStyle.THREE_D:
      return `Style: 3D clay render. Matte plastic / clay material, soft studio lighting, cute rounded forms.`
    default:
      return color ? `Style: vector icon in ${color}.` : `Style: vector icon.`
  }
}

const openaiBackgroundLine = (ctx: BuildContext): string =>
{
  if (ctx.useTransparent)
  {
    return 'Background: fully transparent (RGBA PNG). Crisp silhouette, no halos, no fringing, no solid color behind the icon.'
  }
  return `Background: a flat solid ${ctx.maskColor} chroma-key, edge-to-edge, seamless. No gradients, no shadows, no vignette, no border.`
}

const openaiConstraintsLine = (ctx: BuildContext): string =>
{
  const parts: string[] = [
    ctx.params.framed
      ? 'single isolated subject, centered, with very generous empty space around it (the subject must occupy at most ~60% of the canvas)'
      : 'single isolated subject, centered, generous padding',
    'no app-icon container, no rounded square or squircle base',
    'no border, no frame, no margin, no card, no badge',
    'no extra text, no watermark, no signature, no logos',
  ]
  if (ctx.is3D)
  {
    parts.push('no floor, no ground, no platform, no podium, no shadow on the surface')
  }
  else
  {
    parts.push('no photorealism, no noise, no grain, no blur')
  }
  if (!ctx.is3D && ctx.params.isUiIcon)
  {
    parts.push('readable at 24px, simplicity over detail, minimal strokes')
  }
  return `Constraints: ${parts.join('; ')}.`
}

const buildOpenAIPrompt = (ctx: BuildContext): string =>
{
  const { promptText, params, is3D, singleColor } = ctx
  const styleLine = openaiStyleLine(params.style, singleColor ? params.color : undefined)
  const backgroundLine = openaiBackgroundLine(ctx)
  const constraintsLine = openaiConstraintsLine(ctx)
  const paddingLine = params.padding > 0
    ? `Composition: distinct separation from canvas edges, approx. ${params.padding}px padding.`
    : 'Composition: fits effectively within the frame.'

  const role = is3D
    ? `Role: expert 3D modeler producing a single isolated ${params.style === IconStyle.ISOMETRIC ? 'isometric 3D object' : '3D rendered object'}.`
    : 'Role: senior icon designer producing clean, vector-like shapes with a strong silhouette and balanced negative space.'

  // Inspire mode: external uploads or "inspire" reference selected
  if (params.hasExternalRefs || params.referenceMode === 'inspire')
  {
    return [
      role,
      `Mode: inspiration. Use the same style, lighting, and rendering technique from the input image(s).`,
      `Subject: generate a new ${is3D ? 'asset' : 'icon'} of "${promptText}" in that style.`,
      backgroundLine,
      constraintsLine,
    ].join(' ')
  }

  // Edit mode: modify a selected icon based on user instruction
  if (params.referenceMode === 'edit' && params.referencePrompt)
  {
    return [
      role,
      `Mode: edit. Original description: "${params.referencePrompt}".`,
      `Change only: "${promptText}". Keep everything else exactly the same — composition, palette, lighting, and style.`,
      styleLine,
      backgroundLine,
      constraintsLine,
    ].join(' ')
  }

  // Default generation
  return [
    role,
    `Subject: "${promptText}".`,
    styleLine,
    paddingLine,
    backgroundLine,
    constraintsLine,
  ].join(' ')
}

// ---------- Gemini: narrative paragraph, semantic phrasing, hard constraints LAST ----------

const geminiStyleClause = (style: IconStyle, color?: string): string =>
{
  switch (style)
  {
    case IconStyle.FLAT_SINGLE_COLOR:
      return `rendered as a minimalist flat vector glyph in solid ${color}, with a clean silhouette, no outlines, no gradients, and no shadows`
    case IconStyle.FLAT_COLORED:
      return `built from clean geometric shapes painted in a small palette of two or three vibrant flat colors, with no gradients and no shadows`
    case IconStyle.OUTLINE:
      return `drawn as monoline line-art with a single consistent stroke width of about four pixels, all lines in ${color}, with no fills, evoking a clean technical blueprint`
    case IconStyle.GRADIENT:
      return `rendered with soft rounded shapes and smooth, trendy gradients, evoking a modern UI aesthetic with subtle glassmorphism`
    case IconStyle.ISOMETRIC:
      return `rendered as a single 3D object in clean orthographic isometric perspective, with crisp geometry and soft shading, floating in the canvas`
    case IconStyle.THREE_D:
      return `rendered as a cute 3D clay object made of matte plastic, lit with soft studio lighting, with rounded organic forms`
    default:
      return color ? `rendered as a vector icon in ${color}` : 'rendered as a vector icon'
  }
}

const geminiBackgroundSentence = (ctx: BuildContext): string =>
{
  // Gemini does not support transparent output. Always describe a solid color.
  return `The background must be a seamless, flat, solid ${ctx.maskColor} canvas, edge-to-edge, with no gradients, no shadows, no vignette, and no texture.`
}

const geminiFinalConstraintsSentence = (ctx: BuildContext): string =>
{
  // Gemini 3 drops early-placed negatives — keep this LAST in the prompt.
  const parts: string[] = [
    ctx.params.framed
      ? 'a single isolated subject centered in the canvas with very generous negative space, occupying at most about 60% of the frame'
      : 'a single isolated subject centered in the canvas with generous negative space',
    'no container shape, no rounded square or squircle base',
    'no border, no frame, no margin, no card, no badge',
    'no extra text, no watermark, no signature, no logos',
  ]
  if (ctx.is3D)
  {
    parts.push('no floor, no ground, no platform, no podium, no shadow on the surface')
  }
  else
  {
    parts.push('no photorealism, no noise, no blur')
  }
  if (!ctx.is3D && ctx.params.isUiIcon)
  {
    parts.push('designed to read clearly at 24px with simple bold shapes')
  }
  return `Final constraints: ${parts.join('; ')}.`
}

const buildGeminiPrompt = (ctx: BuildContext): string =>
{
  const { promptText, params, is3D, singleColor } = ctx
  const styleClause = geminiStyleClause(params.style, singleColor ? params.color : undefined)
  const backgroundSentence = geminiBackgroundSentence(ctx)
  const finalConstraints = geminiFinalConstraintsSentence(ctx)

  const paddingClause = params.padding > 0
    ? `with distinct separation from the canvas edges of about ${params.padding} pixels`
    : 'fitting effectively within the frame'

  // Inspire mode
  if (params.hasExternalRefs || params.referenceMode === 'inspire')
  {
    const assetWord = is3D ? 'asset' : 'icon'
    return [
      `Using the attached image(s) as a style reference, generate a new ${assetWord} of "${promptText}" that matches the artistic style, line work, shading, and color palette of the reference.`,
      `Use a new composition with a single centered subject, ${paddingClause}.`,
      backgroundSentence,
      finalConstraints,
    ].join(' ')
  }

  // Edit mode
  if (params.referenceMode === 'edit' && params.referencePrompt)
  {
    return [
      `Using the attached image as the source, change only this: "${promptText}".`,
      `The original description was "${params.referencePrompt}". Keep everything else exactly the same — same composition, lighting, character, and color palette.`,
      `The result should still be ${styleClause}.`,
      backgroundSentence,
      finalConstraints,
    ].join(' ')
  }

  // Default generation: narrative paragraph
  const subjectPhrase = is3D
    ? `A single 3D rendering of "${promptText}", ${styleClause}, composed as a single floating object centered in the canvas`
    : `A clean vector icon of "${promptText}", ${styleClause}, composed as a single isolated subject centered in the canvas`

  return [
    `${subjectPhrase}, ${paddingClause}.`,
    backgroundSentence,
    finalConstraints,
  ].join(' ')
}

// ---------- Public entry point ----------

export const buildFullPrompt = (
  promptText: string,
  params: PromptBuilderParams,
): string =>
{
  const ctx = buildContext(promptText, params)
  return params.vendor === 'gemini' ? buildGeminiPrompt(ctx) : buildOpenAIPrompt(ctx)
}
