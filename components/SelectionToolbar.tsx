import React from 'react';
import DownloadIcon from './icons/DownloadIcon';
import TrashIcon from './icons/TrashIcon';
import EditIcon from './icons/EditIcon';
import InspirationIcon from './icons/InspirationIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import XCircleIcon from './icons/XCircleIcon';

interface SelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onDelete: () => void;
  onDownload: () => void;
  onToggleSelectAll: () => void;
  onEdit?: () => void;
  onInspire?: () => void;
  onCopy?: () => void;
  isSelectionMode: boolean;
  onExitSelectionMode: () => void;
}

const ToolbarButton: React.FC<{ onClick?: () => void, title: string, children: React.ReactNode, className?: string }> = ({ onClick, title, children, className }) => (
  <button 
    onClick={onClick} 
    disabled={!onClick}
    className={`p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed ${className}`} 
    style={{ color: 'var(--color-text)'}}
    title={title}>
    {children}
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
      className="fixed z-50 border flex items-center gap-1 sm:gap-2 animate-fade-in-scale
                 w-[calc(100%-2rem)] bottom-4 left-4 right-4 p-1.5 rounded-xl justify-between
                 sm:w-auto sm:max-w-[calc(100%-4rem)] sm:left-1/2 sm:-translate-x-1/2 sm:p-2 sm:justify-start"
      style={{ 
        backgroundColor: 'var(--color-surface-blur)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-lg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
        {isSelectionMode && (
          <>
            <ToolbarButton onClick={onExitSelectionMode} title="Exit Selection Mode (Esc)" className="sm:hidden"><XCircleIcon className="w-5 h-5" /></ToolbarButton>
            <div className="h-6 w-px sm:hidden" style={{ backgroundColor: 'var(--color-border)' }} />
          </>
        )}
        <span className="text-sm font-semibold pl-2 pr-1 whitespace-nowrap" style={{ color: 'var(--color-text)' }}>
            {selectedCount} selected
        </span>
        <div className="h-6 w-px" style={{ backgroundColor: 'var(--color-border)' }} />
        <button
            onClick={onToggleSelectAll}
            title={allSelected ? 'Deselect all (Ctrl+D)' : 'Select all (Ctrl+A)'}
            className="text-sm font-semibold px-2 sm:px-3 py-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: 'var(--color-accent)' }}
        >
            {allSelected ? 'Deselect' : 'Select All'}
        </button>
        <div className="h-6 w-px" style={{ backgroundColor: 'var(--color-border)' }} />
        <div className="flex items-center gap-0 sm:gap-1">
            <ToolbarButton onClick={onEdit} title="Edit (only 1 selected)"><EditIcon className="w-5 h-5" /></ToolbarButton>
            <ToolbarButton onClick={onInspire} title="Generate Similar (only 1 selected)"><InspirationIcon className="w-5 h-5" /></ToolbarButton>
            <ToolbarButton onClick={onCopy} title="Copy Image (only 1 selected)"><ClipboardIcon className="w-5 h-5" /></ToolbarButton>
            <ToolbarButton onClick={onDownload} title="Download Selected"><DownloadIcon className="w-5 h-5" /></ToolbarButton>
            <ToolbarButton onClick={onDelete} title="Delete Selected" className="hover:!bg-red-500/10 text-red-500"><TrashIcon className="w-5 h-5" /></ToolbarButton>
        </div>
    </div>
  );
};

export default SelectionToolbar;