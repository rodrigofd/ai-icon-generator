import React, { useEffect, useCallback } from 'react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Yes, Delete",
  cancelLabel = "No, Cancel",
  onConfirm,
  onCancel,
}) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'Escape' || e.key.toLowerCase() === 'n') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter' || e.key.toLowerCase() === 'y') {
      e.preventDefault();
      onConfirm();
    }
  }, [isOpen, onConfirm, onCancel]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="dialog_title"
      aria-describedby="dialog_desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div 
        className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-md animate-fade-in" 
        onClick={onCancel} 
        style={{ animationDuration: '0.3s' }}
      />
      <div
        className="relative w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 animate-fade-in-scale"
        style={{ animationDuration: '0.3s' }}
      >
        <h2 id="dialog_title" className="text-2xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
        <p id="dialog_desc" className="mt-2 text-base text-gray-600 dark:text-gray-300">{message}</p>
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-md font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className="px-6 py-2 rounded-md font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;