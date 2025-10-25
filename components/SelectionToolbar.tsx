
import React from 'react';
import DownloadIcon from './icons/DownloadIcon';
import TrashIcon from './icons/TrashIcon';

interface SelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onDelete: () => void;
  onDownload: () => void;
  onToggleSelectAll: () => void;
}

const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  selectedCount,
  totalCount,
  onDelete,
  onDownload,
  onToggleSelectAll,
}) => {
  if (selectedCount === 0) {
    return null;
  }

  const allSelected = selectedCount === totalCount;

  return (
    <div
      data-selection-toolbar="true"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 w-auto max-w-[90vw] z-50 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl p-2 flex items-center justify-between gap-4 transition-opacity duration-300"
    >
        <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-800 dark:text-white pl-2">
                {selectedCount} selected
            </span>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
            
            <button
                onClick={onToggleSelectAll}
                className="text-sm font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 transition-colors px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            >
                {allSelected ? 'Deselect All' : 'Select All'}
            </button>
        </div>
      
        <div className="flex items-center gap-2">
            <button
                onClick={onDownload}
                className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 hover:bg-teal-500 dark:hover:bg-teal-600 hover:text-white dark:hover:text-white transition-colors flex items-center gap-2"
                title="Download Selected"
            >
                <DownloadIcon className="w-5 h-5" />
            </button>
            <button
                onClick={onDelete}
                className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 hover:bg-red-500 dark:hover:bg-red-600 hover:text-white dark:hover:text-white transition-colors flex items-center gap-2"
                title="Delete Selected"
            >
                <TrashIcon className="w-5 h-5" />
            </button>
      </div>
    </div>
  );
};

export default SelectionToolbar;
