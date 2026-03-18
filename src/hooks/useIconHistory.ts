import { useState, useEffect, useRef, useCallback } from 'react'
import localforage from 'localforage'
import { GeneratedIcon } from '../types'

export const useIconHistory = () =>
{
  const [history, setHistory] = useState<GeneratedIcon[]>([])
  const [newlyAddedIds, setNewlyAddedIds] = useState(new Set<string>())
  const [deletingIds, setDeletingIds] = useState(new Set<string>())
  const [confirmingDelete, setConfirmingDelete] = useState<{ ids: string[]; count: number } | null>(null)
  const undoStateRef = useRef<{ history: GeneratedIcon[]; selectedIds: Set<string> } | null>(null)

  // Load history from localforage
  useEffect(() =>
  {
    localforage.getItem<GeneratedIcon[]>('iconHistory')
      .then((storedHistory) =>
      {
        if (storedHistory) setHistory(storedHistory)
      })
      .catch((e: Error) =>
      {
        console.error('Failed to load history', e)
        localforage.removeItem('iconHistory')
      })
  }, [])

  // Save history to localforage
  useEffect(() =>
  {
    localforage.setItem('iconHistory', history)
      .catch((e: Error) => console.error('Failed to save history', e))
  }, [history])

  // Clear newly added animation after 2s
  useEffect(() =>
  {
    if (newlyAddedIds.size > 0)
    {
      const timer = setTimeout(() => setNewlyAddedIds(new Set()), 2000)
      return () => clearTimeout(timer)
    }
  }, [newlyAddedIds])

  const requestDeletion = useCallback((ids: string[]) =>
  {
    if (ids.length === 0) return
    setConfirmingDelete({ ids, count: ids.length })
  }, [])

  const handleConfirmDelete = useCallback((selectedIds: Set<string>, onComplete: (message: string, undoFn: () => void) => void) =>
  {
    if (!confirmingDelete) return
    const idsToDelete = new Set(confirmingDelete.ids)
    undoStateRef.current = { history: [...history], selectedIds: new Set(selectedIds) }

    const count = confirmingDelete.count
    setDeletingIds(idsToDelete)

    setTimeout(() =>
    {
      setHistory(prev => prev.filter(icon => !idsToDelete.has(icon.id)))
      setDeletingIds(new Set())

      onComplete(
        `${count} icon(s) removed.`,
        () =>
        {
          if (undoStateRef.current)
          {
            setHistory(undoStateRef.current.history)
            undoStateRef.current = null
          }
        },
      )
    }, 400)

    setConfirmingDelete(null)
  }, [confirmingDelete, history])

  const handleUndo = useCallback((): Set<string> | null =>
  {
    if (undoStateRef.current)
    {
      setHistory(undoStateRef.current.history)
      const restoredSelection = undoStateRef.current.selectedIds
      undoStateRef.current = null
      return restoredSelection
    }
    return null
  }, [])

  const cancelDelete = useCallback(() =>
  {
    setConfirmingDelete(null)
  }, [])

  return {
    history,
    setHistory,
    newlyAddedIds,
    setNewlyAddedIds,
    deletingIds,
    confirmingDelete,
    requestDeletion,
    handleConfirmDelete,
    handleUndo,
    cancelDelete,
  }
}
