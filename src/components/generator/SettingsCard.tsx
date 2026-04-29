import React from 'react'
import { IconStyle } from '../../types'
import { VARIANT_OPTIONS, QUALITY_OPTIONS, FRAME_PALETTE_OPTIONS, getModelOption } from '../../constants'
import type { Quality } from '../../services/providers/types'
import { VENDORS_WITH_QUALITY } from '../../services/providers/types'
import type { FramePalette } from '../../utils/frameUtils'
import { isSingleColorStyle } from '../../utils/promptBuilder'
import StyleSelector from './StyleSelector'
import Switch from '../common/Switch'
import HelpTip from '../common/HelpTip'
import ModelSelector from './ModelSelector'

// Reusable label-with-tooltip helper
const LabelWithTip: React.FC<{ children: React.ReactNode, tip: React.ReactNode, className?: string, htmlFor?: string }> = ({ children, tip, className, htmlFor }) => (
  <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
    <label htmlFor={htmlFor} className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-dim)]">{children}</label>
    <HelpTip>{tip}</HelpTip>
  </div>
)

interface SettingsCardProps
{
  style: IconStyle
  onStyleChange: (style: IconStyle) => void
  numVariants: number
  onNumVariantsChange: (n: number) => void
  padding: number
  onPaddingChange: (p: number) => void
  isUiIcon: boolean
  onUiIconChange: (v: boolean) => void
  color: string
  onColorChange: (c: string) => void
  isAdvancedOpen: boolean
  onAdvancedToggle: () => void
  customPrompt: string
  onCustomPromptChange: (v: string) => void
  isBatchMode: boolean
  selectedModel: string
  onModelChange: (modelId: string) => void
  quality: Quality
  onQualityChange: (q: Quality) => void
  framed: boolean
  onFramedChange: (v: boolean) => void
  framePalette: FramePalette
  onFramePaletteChange: (p: FramePalette) => void
}

const SettingsCard: React.FC<SettingsCardProps> = ({
  style,
  onStyleChange,
  numVariants,
  onNumVariantsChange,
  padding,
  onPaddingChange,
  isUiIcon,
  onUiIconChange,
  color,
  onColorChange,
  isAdvancedOpen,
  onAdvancedToggle,
  customPrompt,
  onCustomPromptChange,
  isBatchMode,
  selectedModel,
  onModelChange,
  quality,
  onQualityChange,
  framed,
  onFramedChange,
  framePalette,
  onFramePaletteChange,
}) =>
{
  const singleColor = isSingleColorStyle(style)
  const currentVendor = getModelOption(selectedModel)?.vendor
  const showQuality = currentVendor !== undefined && VENDORS_WITH_QUALITY.has(currentVendor)

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm space-y-6">
      <div>
        <LabelWithTip className="mb-3" tip="The visual aesthetic for the icons. Controls the prompt sent to the model and (for Outline / Monochrome) enables a single-color picker.">
          Style
        </LabelWithTip>
        <StyleSelector selected={style} onSelect={onStyleChange} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Variants Control */}
        <div>
          <LabelWithTip className="mb-2" tip="How many icon variants to generate per prompt.">
            Count
          </LabelWithTip>
          <div className="flex bg-[var(--color-surface-secondary)] p-1 rounded-xl border border-[var(--color-border)]">
            {VARIANT_OPTIONS.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => onNumVariantsChange(v)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${numVariants === v
                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm border border-[var(--color-border)]'
                    : 'text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
                  }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Padding Input */}
        <div>
          <LabelWithTip className="mb-2" htmlFor="padding" tip="Transparent margin (in px) added around the generated icon. Also hints the model to leave proportional breathing room. Ignored when App-tile Frame is on (the tile handles its own layout).">
            Padding (px)
          </LabelWithTip>
          <input
            id="padding"
            type="number"
            value={padding}
            onChange={e => onPaddingChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="w-full h-[42px] bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl text-center font-semibold focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            style={{ color: 'var(--color-text)' }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex items-center justify-between bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl p-3 flex-1">
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-sm font-medium">Optimize for UI</span>
            <HelpTip>Hints the model to keep details simple and legible at small sizes (down to 24px). Ideal for app/UI icons; turn off for richer, more detailed illustrations.</HelpTip>
          </div>
          <Switch id="ui-icon-toggle" checked={isUiIcon} onChange={onUiIconChange} />
        </div>

        <div className={`relative flex-1 h-[50px] rounded-xl border border-[var(--color-border)] overflow-hidden transition-all duration-300 ${singleColor ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`} title={singleColor ? 'Tap to pick the icon color' : 'Color picker is only used by Monochrome and Outline styles'}>
          <input id="native-color-picker" type="color" value={color} onChange={(e) => onColorChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <div className="w-full h-full flex items-center justify-center gap-2" style={{ backgroundColor: color }}>
            <span className="font-mono text-sm font-bold bg-black/20 backdrop-blur-sm text-white px-2 py-1 rounded uppercase shadow-sm">{color}</span>
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-sm font-medium">App-tile Frame</span>
            <HelpTip>
              Wraps each icon in a rounded square tile with a gradient background derived from the icon — Android launcher style. The tile corners stay transparent so it composites cleanly on any wallpaper.
            </HelpTip>
          </div>
          <Switch id="frame-toggle" checked={framed} onChange={onFramedChange} />
        </div>
        {framed && (
          <div className="border-t border-[var(--color-border)] px-3 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Palette</span>
              <HelpTip>
                <strong>Auto</strong> — picks a complement (mono icons) or analogous pastel (colored icons).<br />
                <strong>Light / Dark</strong> — soft tints derived from the icon hue.<br />
                <strong>Vibrant</strong> — bold, saturated tile.
              </HelpTip>
            </div>
            <div className="flex bg-[var(--color-surface)] p-0.5 rounded-lg border border-[var(--color-border)] flex-1 max-w-[280px]">
              {FRAME_PALETTE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onFramePaletteChange(opt.id)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${framePalette === opt.id
                      ? 'bg-[var(--color-surface-secondary)] text-[var(--color-text)] shadow-sm border border-[var(--color-border)]'
                      : 'text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Toggle */}
      <div className="border-t border-[var(--color-border)] pt-4">
        <button type="button" onClick={onAdvancedToggle} className="text-xs font-semibold text-[var(--color-text-dim)] hover:text-[var(--color-accent)] transition-colors flex items-center gap-1">
          {isAdvancedOpen ? 'Hide Advanced' : 'Show Advanced'}
        </button>
        <div className={`transition-all duration-300 overflow-hidden ${isAdvancedOpen ? 'max-h-[600px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
          <div className="space-y-4 p-4 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)]">
            <div>
              <LabelWithTip className="mb-2" tip="The fully-resolved prompt sent to the model, derived from your inputs above. Edit to fine-tune for one-off generations; reverts when any setting changes.">
                Custom Prompt Override
              </LabelWithTip>
              <textarea
                value={customPrompt}
                onChange={e => onCustomPromptChange(e.target.value)}
                readOnly={isBatchMode}
                className="w-full h-24 text-xs font-mono p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] focus:outline-none text-[var(--color-text-dim)] resize-none"
              />
            </div>
            <div>
              <LabelWithTip className="mb-2" tip="The image-generation model. Each prompt is automatically tuned per vendor. gpt-image-1 supports native transparency; other models render on a chroma-key the app then knocks out.">
                AI Model
              </LabelWithTip>
              <ModelSelector selectedModel={selectedModel} onModelChange={onModelChange} />
            </div>
            {showQuality && (
              <div>
                <LabelWithTip className="mb-2" tip="Quality vs. speed trade-off. Low is ~10× faster than High and usually plenty for icons.">
                  Quality
                </LabelWithTip>
                <div className="flex bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)]">
                  {QUALITY_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onQualityChange(opt.id)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${quality === opt.id
                          ? 'bg-[var(--color-surface-secondary)] text-[var(--color-text)] shadow-sm border border-[var(--color-border)]'
                          : 'text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsCard
