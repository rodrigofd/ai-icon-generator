import { useState, useCallback, useRef, useEffect } from 'react'
import { GeneratedIcon } from '../types'

export const useSelection = (history: GeneratedIcon[]) =>
{
  const [selectedIds, setSelectedIds] = useState(new Set<string>())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  // Drag selection
  const [isDragging, setIsDragging] = useState(false)
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const dragStartPoint = useRef<{ x: number; y: number } | null>(null)
  const dragInitialSelection = useRef<Set<string> | null>(null)

  // Touch long-press
  const longPressTimeout = useRef<number | null>(null)

  // Ref map for icon card DOM elements (needed for drag-select intersection)
  const iconCardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const exitSelectionMode = useCallback(() =>
  {
    setIsSelectionMode(false)
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }, [])

  const handleToggleSelectAll = useCallback(() =>
  {
    if (selectedIds.size === history.length)
    {
      setSelectedIds(new Set())
    }
    else
    {
      setSelectedIds(new Set(history.map(icon => icon.id)))
    }
  }, [history, selectedIds])

  const handleIconClick = useCallback((e: React.MouseEvent, clickedId: string) =>
  {
    if (isSelectionMode)
    {
      const newSelection = new Set(selectedIds)
      newSelection.has(clickedId) ? newSelection.delete(clickedId) : newSelection.add(clickedId)
      if (newSelection.size === 0) exitSelectionMode()
      setSelectedIds(newSelection)
      setLastSelectedId(clickedId)
      return
    }

    const { shiftKey, ctrlKey, metaKey } = e
    const isCtrl = ctrlKey || metaKey

    let newSelection = new Set(selectedIds)

    if (shiftKey && lastSelectedId && history.length > 0)
    {
      const lastIndex = history.findIndex(i => i.id === lastSelectedId)
      const currentIndex = history.findIndex(i => i.id === clickedId)
      if (lastIndex !== -1 && currentIndex !== -1)
      {
        const from = Math.min(lastIndex, currentIndex)
        const to = Math.max(lastIndex, currentIndex)
        const rangeIds = history.slice(from, to + 1).map(i => i.id)

        if (!isCtrl) newSelection.clear()
        rangeIds.forEach(id => newSelection.add(id))
      }
    }
    else if (isCtrl)
    {
      newSelection.has(clickedId) ? newSelection.delete(clickedId) : newSelection.add(clickedId)
      setLastSelectedId(clickedId)
    }
    else
    {
      newSelection.clear()
      newSelection.add(clickedId)
      setLastSelectedId(clickedId)
    }

    setSelectedIds(newSelection)
  }, [history, lastSelectedId, selectedIds, isSelectionMode, exitSelectionMode])

  // Drag selection
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) =>
  {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('[data-icon-card="true"]') || target.closest('[data-selection-toolbar="true"]'))
    {
      return
    }

    e.preventDefault()
    setIsDragging(true)
    dragStartPoint.current = { x: e.clientX, y: e.clientY }
    setSelectionBox({ x: e.clientX, y: e.clientY, width: 0, height: 0 })

    const isCtrl = e.ctrlKey || e.metaKey
    const isShift = e.shiftKey

    if (isCtrl || isShift)
    {
      dragInitialSelection.current = new Set(selectedIds)
    }
    else
    {
      setSelectedIds(new Set())
      dragInitialSelection.current = new Set()
    }
  }, [selectedIds])

  const handleMouseMove = useCallback((e: MouseEvent) =>
  {
    if (!isDragging || !dragStartPoint.current || !dragInitialSelection.current) return
    e.preventDefault()

    const startX = dragStartPoint.current.x
    const startY = dragStartPoint.current.y
    const currentX = e.clientX
    const currentY = e.clientY

    const x = Math.min(startX, currentX)
    const y = Math.min(startY, currentY)
    const width = Math.abs(startX - currentX)
    const height = Math.abs(startY - currentY)

    setSelectionBox({ x, y, width, height })

    const selectionRect = { left: x, top: y, right: x + width, bottom: y + height }
    const itemsInBox = new Set<string>()

    iconCardRefs.current.forEach((el, id) =>
    {
      if (el)
      {
        const elRect = el.getBoundingClientRect()
        const intersects = !(
          selectionRect.right < elRect.left ||
          selectionRect.left > elRect.right ||
          selectionRect.bottom < elRect.top ||
          selectionRect.top > elRect.bottom
        )
        if (intersects)
        {
          itemsInBox.add(id)
        }
      }
    })

    const newSelection = new Set(dragInitialSelection.current)
    itemsInBox.forEach(id => newSelection.add(id))
    setSelectedIds(newSelection)
  }, [isDragging])

  const handleMouseUp = useCallback(() =>
  {
    if (isDragging)
    {
      setIsDragging(false)
      setSelectionBox(null)
      dragStartPoint.current = null
      dragInitialSelection.current = null
    }
  }, [isDragging])

  useEffect(() =>
  {
    if (isDragging)
    {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () =>
    {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Touch long-press
  const handleTouchStart = (id: string) =>
  {
    longPressTimeout.current = window.setTimeout(() =>
    {
      setIsSelectionMode(true)
      setSelectedIds(prev => new Set(prev).add(id))
      setLastSelectedId(id)
      if (navigator.vibrate) navigator.vibrate(50)
      longPressTimeout.current = null
    }, 500)
  }

  const handleTouchMove = () =>
  {
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current)
  }

  const handleTouchEnd = () =>
  {
    if (longPressTimeout.current)
    {
      clearTimeout(longPressTimeout.current)
    }
  }

  return {
    selectedIds,
    setSelectedIds,
    lastSelectedId,
    isSelectionMode,
    selectionBox,
    iconCardRefs,
    exitSelectionMode,
    handleToggleSelectAll,
    handleIconClick,
    handleMouseDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
}
