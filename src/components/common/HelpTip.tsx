import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface HelpTipProps
{
  children: React.ReactNode
  className?: string
}

interface Position
{
  top: number
  left: number
  arrow: 'up' | 'down'
}

const POPOVER_GAP = 8
const VIEWPORT_MARGIN = 12
const FALLBACK_WIDTH = 260
const FALLBACK_HEIGHT = 80

const HelpTip: React.FC<HelpTipProps> = ({ children, className }) =>
{
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Position | null>(null)

  const updatePosition = useCallback(() =>
  {
    const btn = btnRef.current
    if (!btn) return
    const pop = popoverRef.current
    const rect = btn.getBoundingClientRect()
    const popW = pop?.offsetWidth ?? FALLBACK_WIDTH
    const popH = pop?.offsetHeight ?? FALLBACK_HEIGHT
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Default: below the button, with a small horizontal anchor offset so the popover
    // appears to "drop" from the icon (centered-ish but biased toward the right).
    let top = rect.bottom + POPOVER_GAP
    let arrow: 'up' | 'down' = 'up'

    // Flip above if there's not enough room below
    if (top + popH > vh - VIEWPORT_MARGIN)
    {
      const above = rect.top - POPOVER_GAP - popH
      if (above >= VIEWPORT_MARGIN)
      {
        top = above
        arrow = 'down'
      }
    }

    // Horizontal: prefer left-aligned with the icon, then clamp within viewport
    let left = rect.left - 4
    if (left + popW > vw - VIEWPORT_MARGIN)
    {
      left = vw - popW - VIEWPORT_MARGIN
    }
    if (left < VIEWPORT_MARGIN)
    {
      left = VIEWPORT_MARGIN
    }

    setPos({ top, left, arrow })
  }, [])

  useLayoutEffect(() =>
  {
    if (open) updatePosition()
  }, [open, updatePosition])

  useEffect(() =>
  {
    if (!open) return

    const onPointerDown = (e: PointerEvent) =>
    {
      const b = btnRef.current
      const p = popoverRef.current
      if ((b && b.contains(e.target as Node)) || (p && p.contains(e.target as Node))) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) =>
    {
      if (e.key === 'Escape') setOpen(false)
    }
    const onScrollOrResize = () => updatePosition()

    document.addEventListener('pointerdown', onPointerDown, { passive: true })
    document.addEventListener('keydown', onKey)
    // Capture so nested scrollables also trigger reposition
    window.addEventListener('scroll', onScrollOrResize, { passive: true, capture: true })
    window.addEventListener('resize', onScrollOrResize)

    return () =>
    {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScrollOrResize, { capture: true })
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, updatePosition])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="More info"
        aria-expanded={open}
        onClick={(e) =>
        {
          e.preventDefault()
          e.stopPropagation()
          setOpen(o => !o)
        }}
        className={`w-4 h-4 rounded-full border border-[var(--color-border)] text-[10px] leading-none font-semibold text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:border-[var(--color-text-dim)] flex items-center justify-center transition-colors select-none shrink-0 ${className ?? ''}`}
      >
        ?
      </button>
      {open && createPortal(
        <div
          ref={popoverRef}
          role="tooltip"
          style={{
            position: 'fixed',
            top: pos?.top ?? 0,
            left: pos?.left ?? 0,
            visibility: pos ? 'visible' : 'hidden',
            maxWidth: 'min(260px, calc(100vw - 24px))',
          }}
          className="z-[10000] w-max bg-[var(--color-surface)] text-[11px] leading-snug text-[var(--color-text)] p-2.5 rounded-lg shadow-xl border border-[var(--color-border)] animate-fade-in"
        >
          {children}
        </div>,
        document.body,
      )}
    </>
  )
}

export default HelpTip
