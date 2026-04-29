import React, { useEffect, useState, useCallback } from 'react'
import { AVAILABLE_MODELS, VENDOR_LABELS, VENDOR_LOGOS, getModelOption } from '../../constants'
import type { ModelOption, Vendor } from '../../services/providers/types'
import Portal from '../common/Portal'

interface ModelSelectorProps
{
  selectedModel: string
  onModelChange: (modelId: string) => void
}

const CostTier: React.FC<{ tier: number }> = ({ tier }) =>
(
  <span className="font-mono text-[11px] tracking-tight text-[var(--color-text-dim)]" aria-label={`Cost tier ${tier} of 4`}>
    {Array.from({ length: 4 }).map((_, i) => (
      <span key={i} className={i < tier ? 'text-[var(--color-text)]' : 'opacity-30'}>$</span>
    ))}
  </span>
)

const TransparencyBadge: React.FC = () =>
(
  <span
    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20"
    title="Native transparent background support"
  >
    <svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 2h4v4M14 2h-4v4M2 14h4v-4M14 14h-4v-4" />
    </svg>
    Transparent
  </span>
)

const TaglineBadge: React.FC<{ text: string }> = ({ text }) =>
(
  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-[var(--color-surface-secondary)] text-[var(--color-text-dim)] border border-[var(--color-border)]">
    {text}
  </span>
)

const ModelOptionCard: React.FC<{
  model: ModelOption
  isSelected: boolean
  onSelect: () => void
}> = ({ model, isSelected, onSelect }) =>
(
  <button
    type="button"
    role="option"
    aria-selected={isSelected}
    onClick={onSelect}
    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
      isSelected
        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 shadow-sm'
        : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-text-dim)] active:scale-[0.99]'
    }`}
  >
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
      isSelected ? 'border-[var(--color-accent)] bg-[var(--color-accent)]' : 'border-[var(--color-border)]'
    }`}>
      {isSelected && (
        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 6.5l2.5 2.5 4.5-5" />
        </svg>
      )}
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-sm text-[var(--color-text)] truncate">{model.name}</span>
        {model.tagline && <TaglineBadge text={model.tagline} />}
        {model.supportsTransparency && <TransparencyBadge />}
      </div>
    </div>

    <CostTier tier={model.costTier} />
  </button>
)

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange }) =>
{
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const current = getModelOption(selectedModel)

  const close = useCallback(() => setIsOpen(false), [])

  useEffect(() =>
  {
    if (!isOpen) return

    // Trigger enter animation on next frame
    const raf = requestAnimationFrame(() => setIsMounted(true))

    const onKey = (e: KeyboardEvent) =>
    {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    return () =>
    {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      setIsMounted(false)
    }
  }, [isOpen, close])

  const handleSelect = (modelId: string) =>
  {
    onModelChange(modelId)
    close()
  }

  if (!current) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-text-dim)] active:scale-[0.99] transition-all flex items-center gap-3 text-left"
      >
        <img
          src={VENDOR_LOGOS[current.vendor]}
          alt=""
          aria-hidden="true"
          className="w-7 h-7 object-contain shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-[var(--color-text)] truncate">{current.name}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-dim)] mt-0.5">
            <span className="truncate">{VENDOR_LABELS[current.vendor]}</span>
            <span aria-hidden="true">·</span>
            <CostTier tier={current.costTier} />
            {current.tagline && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{current.tagline}</span>
              </>
            )}
            {current.supportsTransparency && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate text-[var(--color-accent)]">Transparent</span>
              </>
            )}
          </div>
        </div>
        <svg className="w-4 h-4 text-[var(--color-text-dim)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </button>

      {isOpen && (
        <Portal>
          <div className="fixed inset-0 z-[10000] flex items-end sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Choose AI model">
            {/* Backdrop */}
            <div
              className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${isMounted ? 'opacity-100' : 'opacity-0'}`}
              onClick={close}
            />

            {/* Panel: bottom sheet on mobile, centered modal on desktop */}
            <div
              className={`relative w-full sm:max-w-md sm:mx-4 bg-[var(--color-surface)] border-t sm:border border-[var(--color-border)] rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[88vh] sm:max-h-[80vh] flex flex-col transition-all duration-200 ease-out ${
                isMounted ? 'translate-y-0 sm:scale-100 opacity-100' : 'translate-y-full sm:translate-y-0 sm:scale-95 opacity-0 sm:opacity-0'
              }`}
            >
              {/* Mobile drag handle */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
                <h2 className="font-semibold text-[var(--color-text)]">Choose AI Model</h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="p-1.5 rounded-lg hover:bg-[var(--color-surface-secondary)] transition-colors text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5" role="listbox" aria-label="Available models">
                {(Object.keys(VENDOR_LABELS) as Vendor[]).map(vendor =>
                {
                  const vendorModels = AVAILABLE_MODELS.filter(m => m.vendor === vendor)
                  if (vendorModels.length === 0) return null
                  return (
                    <div key={vendor} className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <img
                          src={VENDOR_LOGOS[vendor]}
                          alt=""
                          aria-hidden="true"
                          className="w-5 h-5 object-contain"
                        />
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-dim)]">
                          {VENDOR_LABELS[vendor]}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {vendorModels.map(model => (
                          <ModelOptionCard
                            key={model.id}
                            model={model}
                            isSelected={model.id === selectedModel}
                            onSelect={() => handleSelect(model.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Safe-area padding for mobile */}
              <div className="sm:hidden h-[env(safe-area-inset-bottom)]" />
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}

export default ModelSelector
