import React from 'react'
import { IconStyle } from '../../types'
import Spinner from '../common/Spinner'
import SettingsIcon from '../icons/SettingsIcon'
import StyleSelector from './StyleSelector'

interface CompactHeaderProps
{
  visible: boolean
  prompt: string
  onPromptChange: (value: string) => void
  isLoading: boolean
  onSubmit: (e: React.FormEvent) => void
  isCompactSettingsOpen: boolean
  onToggleSettings: () => void
  style: IconStyle
  onStyleChange: (style: IconStyle) => void
  color: string
  onColorChange: (c: string) => void
  numVariants: number
  onNumVariantsChange: (n: number) => void
}

const CompactHeader: React.FC<CompactHeaderProps> = ({
  visible,
  prompt,
  onPromptChange,
  isLoading,
  onSubmit,
  isCompactSettingsOpen,
  onToggleSettings,
  style,
  onStyleChange,
  color,
  onColorChange,
  numVariants,
  onNumVariantsChange,
}) => (
  <div className={`fixed top-0 left-0 right-0 z-40 transform transition-all duration-300 ease-in-out lg:hidden ${visible ? 'translate-y-0 shadow-lg' : '-translate-y-full shadow-none'}`}>
    <div className="bg-[var(--color-surface-blur)] backdrop-blur-xl border-b border-[var(--color-border)] p-3">
      <form onSubmit={onSubmit} className="max-w-6xl mx-auto relative">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder="Describe icon..."
              className="w-full h-10 pl-4 pr-10 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-full text-sm focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
              style={{ color: 'var(--color-text)' }}
            />
          </div>
          <button
            type="button"
            onClick={onToggleSettings}
            className={`p-2.5 rounded-full border transition-all ${
              isCompactSettingsOpen
                ? 'bg-[var(--color-accent)] text-white border-transparent'
                : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-dim)] border-[var(--color-border)] hover:text-[var(--color-text)]'
            }`}
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="h-10 w-10 flex items-center justify-center bg-[var(--color-accent)] text-white rounded-full shadow-sm disabled:opacity-70 active:scale-95 transition-transform"
          >
            {isLoading ? <Spinner className="w-5 h-5" /> : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            )}
          </button>
        </div>

        {/* Collapsible Settings Panel */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCompactSettingsOpen ? 'max-h-[300px] opacity-100 mt-3 pb-1' : 'max-h-0 opacity-0'}`}>
          <div className="p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-dim)] mb-2">Style</label>
              <StyleSelector selected={style} onSelect={onStyleChange} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)]">
                <span className="text-xs font-medium text-[var(--color-text-dim)]">Color</span>
                <input type="color" value={color} onChange={(e) => onColorChange(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-none bg-transparent" />
              </div>
              <div className="flex-1 flex items-center justify-between px-3 py-2 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)]">
                <span className="text-xs font-medium text-[var(--color-text-dim)]">Count</span>
                <div className="flex gap-1">
                  {[1, 2, 4].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => onNumVariantsChange(n)}
                      className={`w-6 h-6 text-xs rounded flex items-center justify-center ${
                        numVariants === n
                          ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
                          : 'text-[var(--color-text-dim)]'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
)

export default CompactHeader
