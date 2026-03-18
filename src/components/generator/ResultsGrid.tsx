import React from 'react'
import { GeneratedIcon } from '../../types'
import IconCard from '../IconCard'
import IconCardSkeleton from '../IconCardSkeleton'
import EmptyState from './EmptyState'

interface ResultsGridProps
{
  history: GeneratedIcon[]
  isLoading: boolean
  skeletonsCount: number
  selectedIds: Set<string>
  processingIds: Set<string>
  newlyAddedIds: Set<string>
  deletingIds: Set<string>
  iconCardRefs: React.MutableRefObject<Map<string, HTMLDivElement>>
  resultsSectionRef: React.RefObject<HTMLDivElement>
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
  onIconClick: (e: React.MouseEvent, id: string) => void
  onDelete: (id: string) => void
  onPromptCopy: () => void
  onCopyImage: (id: string) => void
  onDownload: (id: string, prompt: string) => void
  onEditRequest: (id: string) => void
  onInspireRequest: (id: string) => void
  onRemoveBackground: (id: string) => void
  onTouchStart: (id: string) => void
  onTouchMove: () => void
  onTouchEnd: () => void
}

const ResultsGrid: React.FC<ResultsGridProps> = ({
  history,
  isLoading,
  skeletonsCount,
  selectedIds,
  processingIds,
  newlyAddedIds,
  deletingIds,
  iconCardRefs,
  resultsSectionRef,
  onMouseDown,
  onIconClick,
  onDelete,
  onPromptCopy,
  onCopyImage,
  onDownload,
  onEditRequest,
  onInspireRequest,
  onRemoveBackground,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) =>
{
  const newIdsArray = Array.from(newlyAddedIds)

  return (
    <div className="lg:col-span-7 flex flex-col min-h-[500px]" onMouseDown={onMouseDown}>
      {(history.length > 0 || isLoading) ? (
        <div ref={resultsSectionRef} className="space-y-6 pb-20 flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--color-text)]">Generated Icons</h2>
            <span className="text-sm text-[var(--color-text-dim)]">{history.length} assets</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-4 select-none">
            {isLoading && Array.from({ length: skeletonsCount }).map((_, index) =>
              <IconCardSkeleton key={`skeleton-${index}`} />,
            )}
            {history.map(icon =>
            {
              const isNew = newlyAddedIds.has(icon.id)
              const isDeleting = deletingIds.has(icon.id)
              return (
                <div
                  key={icon.id}
                  ref={(el) =>
                  {
                    if (el) iconCardRefs.current.set(icon.id, el)
                    else iconCardRefs.current.delete(icon.id)
                  }}
                  className={isDeleting ? 'scale-0 opacity-0 transition-all duration-300' : isNew ? 'animate-scale-in' : ''}
                  style={isNew ? { animationDelay: `${newIdsArray.findIndex(id => id === icon.id) * 50}ms` } : {}}
                  onTouchStart={() => onTouchStart(icon.id)}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  <IconCard
                    {...icon}
                    isSelected={selectedIds.has(icon.id)}
                    isProcessing={processingIds.has(icon.id)}
                    onSelect={onIconClick}
                    onDelete={onDelete}
                    onPromptCopy={onPromptCopy}
                    onCopyImage={onCopyImage}
                    onDownload={onDownload}
                    onEditRequest={onEditRequest}
                    onInspireRequest={onInspireRequest}
                    onRemoveBackground={onRemoveBackground}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}

export default ResultsGrid
