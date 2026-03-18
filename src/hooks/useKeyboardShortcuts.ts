import { useEffect } from 'react'

interface UseKeyboardShortcutsParams
{
  isLoading: boolean
  formRef: React.RefObject<HTMLFormElement | null>
  selectedIds: Set<string>
  confirmingDelete: boolean
  onToggleSelectAll: () => void
  onUndo: () => void
  onExitSelectionMode: () => void
  onDeleteSelected: () => void
}

export const useKeyboardShortcuts = ({
  isLoading,
  formRef,
  selectedIds,
  confirmingDelete,
  onToggleSelectAll,
  onUndo,
  onExitSelectionMode,
  onDeleteSelected,
}: UseKeyboardShortcutsParams) =>
{
  useEffect(() =>
  {
    const handleKeyDown = (e: KeyboardEvent) =>
    {
      const isInput = (e.target as HTMLElement).matches('textarea, input, select')

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter')
      {
        e.preventDefault()
        if (!isLoading && formRef.current) formRef.current.requestSubmit()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a')
      {
        if (isInput) return
        e.preventDefault()
        onToggleSelectAll()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z')
      {
        if (isInput) return
        e.preventDefault()
        onUndo()
        return
      }

      if (e.key === 'Escape')
      {
        if (confirmingDelete) return
        e.preventDefault()
        onExitSelectionMode()
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace')
      {
        if (isInput) return
        if (selectedIds.size > 0)
        {
          e.preventDefault()
          onDeleteSelected()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLoading, formRef, selectedIds, confirmingDelete, onToggleSelectAll, onUndo, onExitSelectionMode, onDeleteSelected])
}
