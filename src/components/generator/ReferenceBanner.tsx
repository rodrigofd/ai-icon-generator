import React from 'react'
import { ReferenceIcon } from '../../types'
import XCircleIcon from '../icons/XCircleIcon'

interface ReferenceBannerProps
{
  referenceIcon: ReferenceIcon
  onClear: () => void
}

const ReferenceBanner: React.FC<ReferenceBannerProps> = ({ referenceIcon, onClear }) => (
  <div className="mb-6 p-4 flex items-center justify-between border rounded-2xl animate-scale-in bg-[var(--color-accent-glow)] border-[var(--color-accent-dark)] text-[var(--color-accent)]">
    <div className="flex items-center gap-4 overflow-hidden">
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white shadow-sm border-2 border-white/20 flex-shrink-0">
        <img src={referenceIcon.icon.pngSrc} className="w-full h-full object-contain" alt="Reference Icon" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-bold uppercase tracking-widest opacity-80">
          {referenceIcon.mode === 'edit' ? 'Editing Mode' : 'Inspiration Mode'}
        </span>
        <span className="font-medium truncate text-sm opacity-90">
          Based on: {referenceIcon.icon.prompt}
        </span>
      </div>
    </div>
    <button
      type="button"
      onClick={onClear}
      className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      title="Clear reference"
    >
      <XCircleIcon className="w-6 h-6" />
    </button>
  </div>
)

export default ReferenceBanner
