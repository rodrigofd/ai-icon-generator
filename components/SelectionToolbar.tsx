import React from 'react';
import DownloadIcon from './icons/DownloadIcon';
import TrashIcon from './icons/TrashIcon';
import EditIcon from './icons/EditIcon';
import InspirationIcon from './icons/InspirationIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import XCircleIcon from './icons/XCircleIcon';
import CheckIcon from './icons/CheckIcon';

interface SelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onDelete: () => void;
  onDownload: () => void;
  onToggleSelectAll: () => void;
  onEdit?: () => void;
  onInspire?: () => void;
  onCopy?: () => void;
  isSelectionMode?: boolean;
  onExitSelectionMode?: () => void;
}

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

  const MobileActionButton: React.FC<{
    onClick?: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
  }> = ({ onClick, title, children, className = '' }) => (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-1/5 ${className}`}
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div
      data-selection-toolbar="true"
      className="fixed bottom-0 left-0 right-0 z-50 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-md border-t border-gray-300 dark:border-gray-600
                 md:bottom-5 md:left-1/2 md:-translate-x-1/2 md:w-auto md:max-w-[90vw] md:rounded-lg md:border md:shadow-2xl animate-fade-in-scale"
    >
        {/* --- Desktop View --- */}
        <div className="hidden md:flex items-center justify-between gap-4 p-2">
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-800 dark:text-white pl-2">
                    {selectedCount} selected
                </span>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                <button
                    onClick={onToggleSelectAll}
                    title={allSelected ? 'Deselect all icons (Ctrl+D)' : 'Select all icons (Ctrl+A)'}
                    className="text-sm font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 transition-colors px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                    {allSelected ? 'Deselect All' : 'Select All'}
                </button>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onDownload}
                    className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 hover:bg-teal-500 dark:hover:bg-teal-600 hover:text-white dark:hover:text-white transition-colors flex items-center gap-2"
                    title="Download Selected (Ctrl+S)"
                >
                    <DownloadIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={onDelete}
                    className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 hover:bg-red-500 dark:hover:bg-red-600 hover:text-white dark:hover:text-white transition-colors flex items-center gap-2"
                    title="Delete Selected (Delete/Backspace)"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
          </div>
        </div>

        {/* --- Mobile View --- */}
        <div className="md:hidden w-full flex flex-col">
            {isSelectionMode ? (
            <>
                {/* NEW UI for mobile multi-selection */}
                <div className="flex items-center justify-between p-2 bg-gray-200/50 dark:bg-gray-900/50 border-b border-gray-300 dark:border-gray-600">
                    <button onClick={onExitSelectionMode} className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700" title="Done Selecting">
                        <XCircleIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                    </button>
                    <span className="font-bold text-lg text-gray-800 dark:text-white">{selectedCount} Selected</span>
                    <button
                        onClick={onToggleSelectAll}
                        title={allSelected ? 'Deselect all' : 'Select all'}
                        className="text-sm font-semibold text-teal-600 dark:text-teal-400 px-3 py-1.5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700"
                    >
                        {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                </div>
                <div className="flex items-stretch justify-around w-full p-1">
                    {selectedCount === 1 ? (
                        <>
                            <MobileActionButton onClick={onEdit} title="Edit Icon"><EditIcon className="w-6 h-6 mb-1" /> Edit</MobileActionButton>
                            <MobileActionButton onClick={onInspire} title="Generate Similar"><InspirationIcon className="w-6 h-6 mb-1" /> Similar</MobileActionButton>
                            <MobileActionButton onClick={onCopy} title="Copy as PNG"><ClipboardIcon className="w-6 h-6 mb-1" /> Copy</MobileActionButton>
                            <MobileActionButton onClick={onDownload} title="Download"><DownloadIcon className="w-6 h-6 mb-1" /> Download</MobileActionButton>
                            <MobileActionButton onClick={onDelete} title="Delete" className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"><TrashIcon className="w-6 h-6 mb-1" /> Delete</MobileActionButton>
                        </>
                    ) : (
                        <>
                            <MobileActionButton onClick={onDownload} title="Download Selected" className="w-1/2">
                                <DownloadIcon className="w-6 h-6 mb-1" /> Download All
                            </MobileActionButton>
                            <MobileActionButton onClick={onDelete} title="Delete Selected" className="w-1/2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">
                                <TrashIcon className="w-6 h-6 mb-1" /> Delete All
                            </MobileActionButton>
                        </>
                    )}
                </div>
            </>
            ) : (
            <>
                {/* OLD UI for single selection via tap or desktop-style selection on touch device */}
                <div className="flex items-stretch justify-around w-full p-1">
                    {selectedCount === 1 ? (
                        <>
                            <MobileActionButton onClick={onEdit} title="Edit Icon (Ctrl+E)"><EditIcon className="w-6 h-6 mb-1" /> Edit</MobileActionButton>
                            <MobileActionButton onClick={onInspire} title="Generate Similar (Ctrl+M)"><InspirationIcon className="w-6 h-6 mb-1" /> Similar</MobileActionButton>
                            <MobileActionButton onClick={onCopy} title="Copy as PNG (Ctrl+C)"><ClipboardIcon className="w-6 h-6 mb-1" /> Copy</MobileActionButton>
                            <MobileActionButton onClick={onDownload} title="Download Selected (Ctrl+S)"><DownloadIcon className="w-6 h-6 mb-1" /> Download</MobileActionButton>
                            <MobileActionButton onClick={onDelete} title="Delete Selected (Delete/Backspace)" className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"><TrashIcon className="w-6 h-6 mb-1" /> Delete</MobileActionButton>
                        </>
                    ) : (
                        <>
                            <div className="flex flex-col items-center justify-center p-2 text-center w-1/4">
                                <span className="text-lg font-bold text-gray-800 dark:text-white">{selectedCount}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Selected</span>
                            </div>
                            <MobileActionButton onClick={onToggleSelectAll} title={allSelected ? 'Deselect all (Ctrl+D)' : 'Select all (Ctrl+A)'} className="w-1/4">
                                <span className="text-lg font-semibold">{allSelected ? 'None' : 'All'}</span>
                                <span className="text-xs">Select</span>
                            </MobileActionButton>
                            <MobileActionButton onClick={onDownload} title="Download Selected (Ctrl+S)" className="w-1/4"><DownloadIcon className="w-6 h-6 mb-1" /> Download</MobileActionButton>
                            <MobileActionButton onClick={onDelete} title="Delete Selected (Delete/Backspace)" className="w-1/4 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"><TrashIcon className="w-6 h-6 mb-1" /> Delete</MobileActionButton>
                        </>
                    )}
                </div>
            </>
            )}
        </div>
    </div>
  );
};

export default SelectionToolbar;
