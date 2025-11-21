import React from 'react';
import ClipboardIcon from './icons/ClipboardIcon';
import DownloadIcon from './icons/DownloadIcon';
import TrashIcon from './icons/TrashIcon';
import CheckIcon from './icons/CheckIcon';
import EditIcon from './icons/EditIcon';
import InspirationIcon from './icons/InspirationIcon';
import EraserIcon from './icons/EraserIcon';
import Spinner from './Spinner';

interface IconCardProps {
  id: string;
  pngSrc: string;
  prompt: string;
  isSelected: boolean;
  isProcessing?: boolean;
  onDelete: (id: string) => void;
  onSelect: (e: React.MouseEvent, id: string) => void;
  onPromptCopy: () => void;
  onCopyImage: (id: string) => void; // New prop
  onDownload: (id: string, prompt: string) => void; // New prop for consistent handling
  onEditRequest: (id: string) => void;
  onInspireRequest: (id: string) => void;
  onRemoveBackground: (id: string) => void;
}

const IconCard: React.FC<IconCardProps> = ({ 
  id, 
  pngSrc, 
  prompt, 
  isSelected, 
  isProcessing = false,
  onDelete, 
  onSelect, 
  onPromptCopy, 
  onCopyImage,
  onDownload,
  onEditRequest, 
  onInspireRequest,
  onRemoveBackground
}) => {
  
  const handlePromptClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(prompt);
    onPromptCopy();
  };

  // Wrapper to stop propagation for all action buttons
  const stopProp = (fn: (e: React.MouseEvent) => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn(e);
  };

  return (
    <div
      data-icon-card="true"
      data-id={id}
      onClick={(e) => !isProcessing && onSelect(e, id)}
      onContextMenu={(e) => { e.preventDefault(); !isProcessing && onSelect(e, id); }}
      className={`group relative aspect-square rounded-2xl cursor-pointer overflow-hidden transition-all duration-200
        ${isProcessing ? 'pointer-events-none' : ''} 
        ${isSelected 
          ? 'ring-4 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-bg)] shadow-md scale-[0.98]' 
          : 'hover:shadow-soft-lg hover:scale-[1.01] border border-[var(--color-border)]'
        }
      `}
      style={{
        backgroundColor: 'var(--color-surface)',
        boxShadow: isSelected ? 'var(--shadow-md)' : undefined
      }}
    >
      <div className="absolute inset-0 p-4 flex items-center justify-center">
        <img
            src={pngSrc}
            alt={prompt}
            draggable={false}
            className={`w-full h-full object-contain transition-all duration-500 select-none ${isProcessing ? 'opacity-50 blur-sm scale-95' : 'group-hover:scale-105'}`}
        />
      </div>
      
      {isProcessing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm">
          <Spinner />
        </div>
      )}

      {isSelected && !isProcessing && (
          <div className="absolute top-3 left-3 w-6 h-6 bg-[var(--color-accent)] rounded-full flex items-center justify-center shadow-sm z-10 animate-scale-in">
            <CheckIcon className="w-4 h-4 text-white" strokeWidth={3} />
          </div>
      )}
      
      {/* Hover Overlay */}
      {!isProcessing && (
        <div className={`absolute inset-0 transition-opacity duration-200 flex flex-col justify-between z-20 bg-gradient-to-b from-black/10 via-transparent to-black/60 dark:to-black/80 
          ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
        `}>
          
          {/* Top Actions */}
          <div className="p-2 flex justify-end gap-1 pointer-events-auto transform -translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
             {/* Group primary edit actions - only show on hover/selected */}
             <div className="flex bg-[var(--color-surface)]/90 backdrop-blur-md rounded-lg p-1 border border-[var(--color-border)] shadow-sm" onClick={(e) => e.stopPropagation()}>
                 <button type="button" onClick={stopProp(() => onEditRequest(id))} title="Edit" className="p-1.5 hover:text-[var(--color-accent)] transition-colors"><EditIcon className="w-4 h-4" /></button>
                 <button type="button" onClick={stopProp(() => onInspireRequest(id))} title="Inspire" className="p-1.5 hover:text-[var(--color-accent)] transition-colors"><InspirationIcon className="w-4 h-4" /></button>
                 <button type="button" onClick={stopProp(() => onRemoveBackground(id))} title="Remove BG" className="p-1.5 hover:text-[var(--color-accent)] transition-colors"><EraserIcon className="w-4 h-4" /></button>
             </div>
          </div>

          {/* Bottom Info & Actions */}
          <div className="p-3 pointer-events-auto transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 flex items-end justify-between gap-2" onClick={(e) => e.stopPropagation()}>
             <div onClick={handlePromptClick} className="flex-1 min-w-0 cursor-copy group/text">
                 <p className="text-[10px] text-white/80 line-clamp-2 font-medium leading-tight group-hover/text:text-white transition-colors drop-shadow-sm select-none">{prompt}</p>
             </div>
             
             <div className="flex gap-1 flex-shrink-0">
                <button type="button" onClick={stopProp(() => onCopyImage(id))} className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors border border-white/10" title="Copy PNG">
                   <ClipboardIcon className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={stopProp(() => onDownload(id, prompt))} className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors border border-white/10" title="Download">
                   <DownloadIcon className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={stopProp(() => onDelete(id))} className="p-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-md rounded-full text-white transition-colors shadow-sm" title="Delete">
                   <TrashIcon className="w-3.5 h-3.5" />
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IconCard;