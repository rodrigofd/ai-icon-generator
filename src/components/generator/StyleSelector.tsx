import React from 'react'
import { IconStyle } from '../../types'
import { STYLE_OPTIONS } from '../../constants'

interface StyleSelectorProps
{
  selected: IconStyle
  onSelect: (style: IconStyle) => void
}

const StyleSelector: React.FC<StyleSelectorProps> = ({ selected, onSelect }) => (
  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
    {STYLE_OPTIONS.map((style) => (
      <button
        key={style.id}
        type="button"
        onClick={() => onSelect(style.id)}
        className="group relative flex flex-col items-center gap-2 p-2 rounded-xl transition-all duration-200 outline-none"
      >
        <div
          className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 ${
            selected === style.id
              ? 'border-[var(--color-accent)] shadow-md scale-105'
              : 'border-transparent group-hover:scale-105'
          }`}
          style={{ backgroundColor: 'var(--color-surface-secondary)' }}
        >
          <img src={style.imageUrl} alt={style.label} className="w-full h-full object-cover" />
          {selected === style.id && (
            <div className="absolute inset-0 bg-[var(--color-accent)] opacity-10" />
          )}
        </div>
        <span className={`text-xs font-medium transition-colors ${
          selected === style.id
            ? 'text-[var(--color-accent)]'
            : 'text-[var(--color-text-dim)] group-hover:text-[var(--color-text)]'
        }`}>
          {style.label}
        </span>
      </button>
    ))}
  </div>
)

export default StyleSelector
