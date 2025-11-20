import React from 'react';
import DownloadIcon from './icons/DownloadIcon';
import TrashIcon from './icons/TrashIcon';
import EditIcon from './icons/EditIcon';
import InspirationIcon from './icons/InspirationIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import XCircleIcon from './icons/XCircleIcon';
import EraserIcon from './icons/EraserIcon';

interface SelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onDelete: () => void;
  onDownload: () => void;
  onToggleSelectAll: () => void;
  onEdit?: () => void;
  onInspire?: () => void;
  onCopy?: () => void;
  onRemoveBackground?: () => void;
  isSelectionMode: boolean;
  onExitSelectionMode: () => void;
}

const ToolbarButton: React.FC<{ onClick?: () => void, title: string, children: React.ReactNode, className?: string, label?: string }> = ({ onClick, title, children, className, label }) => (
  <button 
    onClick={onClick} 
    disabled={!onClick}
    className={`group relative p-2 rounded-full transition-all text-[var(--color-text)] hover:bg-[var(--color-text)] hover:text-[var(--color-bg)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--color-text)] flex-shrink-0 flex flex-col items-center gap-1 ${className || ''}`} 
    title={title}>
    {children}
    {label && <span className="sr-only md:not-sr-only md:absolute md:-top-8 md:bg-black md:text-white md:text-[10px] md:px-2 md:py-0.5 md:rounded md:opacity-0 md:group-hover:opacity-100 md:transition-opacity md:whitespace-nowrap pointer-events-none">{label}</span>}
  </button>
);

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
}) => {
  if (selectedCount === 0) {
    return null;
  }

  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div
      data-selection-toolbar="true"
      className="fixed z-50 bottom-6 left-1/2 transform -translate-x-1/2 animate-slide-up"
    >
      <div className="flex items-center gap-2 pl-4 pr-2 py-2 rounded-full border shadow-2xl backdrop-blur-xl"
           style={{ 
             backgroundColor: 'var(--color-surface-blur)', 
             borderColor: 'var(--color-border)',
             maxWidth: '90vw'
           }}>
        
        {isSelectionMode && (
          <button onClick={onExitSelectionMode} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 md:hidden text-[var(--color-text)]"><XCircleIcon className="w-5 h-5" /></button>
        )}

        <div className="flex flex-col md:flex-row items-baseline md:items-center gap-0.5 md:gap-2 mr-2">
            <span className="text-sm font-bold whitespace-nowrap" style={{ color: 'var(--color-text)' }}>{selectedCount}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-dim)] hidden md:inline">Selected</span>
        </div>
        
        <div className="h-6 w-px mx-1 bg-[var(--color-border)]" />
        
        <div className="flex items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
             <ToolbarButton onClick={onEdit} title="Edit" label="Edit"><EditIcon className="w-5 h-5" /></ToolbarButton>
             <ToolbarButton onClick={onInspire} title="Inspire" label="Variant"><InspirationIcon className="w-5 h-5" /></ToolbarButton>
             <ToolbarButton onClick={onRemoveBackground} title="Remove Background" label="Clean"><EraserIcon className="w-5 h-5" /></ToolbarButton>
             <div className="h-4 w-px mx-1 bg-[var(--color-border)]" />
             <ToolbarButton onClick={onCopy} title="Copy" label="Copy"><ClipboardIcon className="w-5 h-5" /></ToolbarButton>
             <ToolbarButton onClick={onDownload} title="Download" label="Download"><DownloadIcon className="w-5 h-5" /></ToolbarButton>
             <ToolbarButton onClick={onDelete} title="Delete" className="hover:!bg-red-500 hover:!text-white !text-red-500" label="Delete"><TrashIcon className="w-5 h-5" /></ToolbarButton>
        </div>

        <div className="h-6 w-px mx-1 bg-[var(--color-border)]" />

        <button
            onClick={onToggleSelectAll}
            className="text-xs font-bold px-3 py-1.5 rounded-full transition-colors hover:bg-[var(--color-accent)] hover:text-white text-[var(--color-accent)]"
        >
            {allSelected ? 'None' : 'All'}
        </button>
      </div>
    </div>
  );
};

export default SelectionToolbar;