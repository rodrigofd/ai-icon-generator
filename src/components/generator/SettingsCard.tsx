import React from 'react'
import { IconStyle } from '../../types'
import { VARIANT_OPTIONS, AVAILABLE_MODELS } from '../../constants'
import { isSingleColorStyle } from '../../utils/promptBuilder'
import StyleSelector from './StyleSelector'
import Switch from '../common/Switch'

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
  onModelChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
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
}) =>
{
  const singleColor = isSingleColorStyle(style)

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm space-y-6">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-dim)] mb-3">Style</label>
        <StyleSelector selected={style} onSelect={onStyleChange} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Variants Control */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-dim)] mb-2">Count</label>
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
          <label htmlFor="padding" className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-dim)] mb-2">Padding (px)</label>
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
          <span className="text-sm font-medium ml-1">Optimize for UI</span>
          <Switch id="ui-icon-toggle" checked={isUiIcon} onChange={onUiIconChange} />
        </div>

        <div className={`relative flex-1 h-[50px] rounded-xl border border-[var(--color-border)] overflow-hidden transition-all duration-300 ${singleColor ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
          <input id="native-color-picker" type="color" value={color} onChange={(e) => onColorChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <div className="w-full h-full flex items-center justify-center gap-2" style={{ backgroundColor: color }}>
            <span className="font-mono text-sm font-bold bg-black/20 backdrop-blur-sm text-white px-2 py-1 rounded uppercase shadow-sm">{color}</span>
          </div>
        </div>
      </div>

      {/* Advanced Toggle */}
      <div className="border-t border-[var(--color-border)] pt-4">
        <button type="button" onClick={onAdvancedToggle} className="text-xs font-semibold text-[var(--color-text-dim)] hover:text-[var(--color-accent)] transition-colors flex items-center gap-1">
          {isAdvancedOpen ? 'Hide Advanced' : 'Show Advanced'}
        </button>
        <div className={`transition-all duration-300 overflow-hidden ${isAdvancedOpen ? 'max-h-[400px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
          <div className="space-y-4 p-4 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)]">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-dim)] mb-2">Custom Prompt Override</label>
              <textarea
                value={customPrompt}
                onChange={e => onCustomPromptChange(e.target.value)}
                readOnly={isBatchMode}
                className="w-full h-24 text-xs font-mono p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] focus:outline-none text-[var(--color-text-dim)] resize-none"
              />
            </div>
            <div>
              <label htmlFor="model-selector" className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-dim)] mb-2">Gemini Model</label>
              <div className="relative">
                <select
                  id="model-selector"
                  value={selectedModel}
                  onChange={onModelChange}
                  className="w-full p-3 text-sm font-medium bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] text-[var(--color-text)] appearance-none focus:outline-none focus:border-[var(--color-accent)]"
                >
                  {AVAILABLE_MODELS.map(model => (
                    <option key={model.id} value={model.id}>{model.label}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-[var(--color-text-dim)]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsCard
