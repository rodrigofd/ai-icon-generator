import React, { useCallback, useEffect, useRef, useState } from 'react'
import DownloadIcon from './icons/DownloadIcon'
import TrashIcon from './icons/TrashIcon'
import EditIcon from './icons/EditIcon'
import InspirationIcon from './icons/InspirationIcon'
import ClipboardIcon from './icons/ClipboardIcon'
import XCircleIcon from './icons/XCircleIcon'
import EraserIcon from './icons/EraserIcon'

interface SelectionToolbarProps
{
  selectedCount: number
  totalCount: number
  onDelete: () => void
  onDownload: () => void
  onToggleSelectAll: () => void
  onEdit?: () => void
  onInspire?: () => void
  onCopy?: () => void
  onRemoveBackground?: () => void
  isSelectionMode: boolean
  onExitSelectionMode: () => void
}

const ToolbarButton: React.FC<{
  onClick?: () => void
  title: string
  children: React.ReactNode
  className?: string
  label?: string
}> = ({ onClick, title, children, className, label }) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    className={`group relative p-2 rounded-full transition-all text-[var(--color-text)] hover:bg-[var(--color-text)] hover:text-[var(--color-bg)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--color-text)] flex-shrink-0 flex flex-col items-center gap-1 ${className || ''}`}
    title={title}
  >
    {children}
    {label && (
      <span className="sr-only md:not-sr-only md:absolute md:-top-8 md:bg-black md:text-white md:text-[10px] md:px-2 md:py-0.5 md:rounded md:opacity-0 md:group-hover:opacity-100 md:transition-opacity md:whitespace-nowrap pointer-events-none">
        {label}
      </span>
    )}
  </button>
)

interface OverflowState
{
  left: boolean
  right: boolean
}

const ScrollableActions: React.FC<{
  overflow: OverflowState
  scrollRef: React.RefObject<HTMLDivElement | null>
  onScrollNudge: (delta: number) => void
  children: React.ReactNode
}> = ({ overflow, scrollRef, onScrollNudge, children }) => (
  <div className="relative min-w-0 flex-shrink">
    <div
      ref={scrollRef}
      className="flex items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden snap-x snap-proximity"
      style={{ scrollbarWidth: 'none' }}
    >
      {children}
    </div>

    {/* Edge fade + chevron at LEFT when content is hidden to the left */}
    <button
      type="button"
      tabIndex={-1}
      aria-label="Scroll left to reveal more actions"
      onClick={() => onScrollNudge(-120)}
      className={`absolute inset-y-0 left-0 w-6 flex items-center justify-start pl-0.5 transition-opacity duration-200 ${
        overflow.left ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        background: 'linear-gradient(to right, var(--color-surface-blur) 30%, transparent)',
      }}
    >
      <svg className="w-3.5 h-3.5 text-[var(--color-text-dim)] animate-pulse-x-left" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 3L5 8l5 5" />
      </svg>
    </button>

    {/* Edge fade + chevron at RIGHT when content is hidden to the right */}
    <button
      type="button"
      tabIndex={-1}
      aria-label="Scroll right to reveal more actions"
      onClick={() => onScrollNudge(120)}
      className={`absolute inset-y-0 right-0 w-6 flex items-center justify-end pr-0.5 transition-opacity duration-200 ${
        overflow.right ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        background: 'linear-gradient(to left, var(--color-surface-blur) 30%, transparent)',
      }}
    >
      <svg className="w-3.5 h-3.5 text-[var(--color-text-dim)] animate-pulse-x-right" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3l5 5-5 5" />
      </svg>
    </button>
  </div>
)

const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  selectedCount,
  totalCount,
  onDelete,
  onDownload,
  onToggleSelectAll,
  onEdit,
  onInspire,
  onCopy,
  onRemoveBackground,
  isSelectionMode,
  onExitSelectionMode,
}) =>
{
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [overflow, setOverflow] = useState<OverflowState>({ left: false, right: false })

  const updateOverflow = useCallback(() =>
  {
    const el = scrollRef.current
    if (!el) return
    const left = el.scrollLeft > 4
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
    setOverflow(prev => (prev.left === left && prev.right === right ? prev : { left, right }))
  }, [])

  const scrollByDelta = useCallback((delta: number) =>
  {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' })
  }, [])

  useEffect(() =>
  {
    if (selectedCount === 0) return
    updateOverflow()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateOverflow, { passive: true })
    window.addEventListener('resize', updateOverflow)
    const ro = new ResizeObserver(updateOverflow)
    ro.observe(el)
    return () =>
    {
      el.removeEventListener('scroll', updateOverflow)
      window.removeEventListener('resize', updateOverflow)
      ro.disconnect()
    }
  }, [selectedCount, updateOverflow])

  if (selectedCount === 0) return null

  const allSelected = selectedCount === totalCount && totalCount > 0

  return (
    <div
      data-selection-toolbar="true"
      className="fixed z-50 bottom-6 left-0 right-0 mx-auto w-fit animate-slide-up"
    >
      <div
        className="flex items-center gap-2 pl-4 pr-2 py-2 rounded-full border shadow-2xl backdrop-blur-xl"
        style={{
          backgroundColor: 'var(--color-surface-blur)',
          borderColor: 'var(--color-border)',
          maxWidth: '95vw',
        }}
      >
        {isSelectionMode && (
          <button onClick={onExitSelectionMode} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 md:hidden text-[var(--color-text)]">
            <XCircleIcon className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col md:flex-row items-baseline md:items-center gap-0.5 md:gap-2 mr-2">
          <span className="text-sm font-bold whitespace-nowrap" style={{ color: 'var(--color-text)' }}>{selectedCount}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-dim)] hidden md:inline">Selected</span>
        </div>

        <div className="h-6 w-px mx-1 bg-[var(--color-border)]" />

        <ScrollableActions
          overflow={overflow}
          scrollRef={scrollRef}
          onScrollNudge={scrollByDelta}
        >
          <ToolbarButton onClick={onEdit} title="Edit" label="Edit"><EditIcon className="w-5 h-5" /></ToolbarButton>
          <ToolbarButton onClick={onInspire} title="Inspire" label="Variant"><InspirationIcon className="w-5 h-5" /></ToolbarButton>
          <ToolbarButton onClick={onRemoveBackground} title="Remove Background" label="Clean"><EraserIcon className="w-5 h-5" /></ToolbarButton>
          <div className="h-4 w-px mx-1 bg-[var(--color-border)]" />
          <ToolbarButton onClick={onCopy} title="Copy" label="Copy"><ClipboardIcon className="w-5 h-5" /></ToolbarButton>
          <ToolbarButton onClick={onDownload} title="Download" label="Download"><DownloadIcon className="w-5 h-5" /></ToolbarButton>
          <ToolbarButton onClick={onDelete} title="Delete" className="hover:!bg-red-500 hover:!text-white !text-red-500" label="Delete"><TrashIcon className="w-5 h-5" /></ToolbarButton>
        </ScrollableActions>

        <div className="h-6 w-px mx-1 bg-[var(--color-border)]" />

        <button
          onClick={onToggleSelectAll}
          className="text-xs font-bold px-3 py-1.5 rounded-full transition-colors hover:bg-[var(--color-accent)] hover:text-white text-[var(--color-accent)]"
        >
          {allSelected ? 'None' : 'All'}
        </button>
      </div>
    </div>
  )
}

export default SelectionToolbar
