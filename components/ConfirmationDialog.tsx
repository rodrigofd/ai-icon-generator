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

const ConfirmationDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    e.stopPropagation(); // Stop events from bubbling up to global handlers (like form submission)
    
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
    }
  }, [isOpen, onConfirm, onCancel]);

  useEffect(() => {
    if (isOpen) {
        document.addEventListener('keydown', handleKeyDown, true); // Capture phase to ensure we intercept before others
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="dialog_title"
      aria-describedby="dialog_desc"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
    >
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" 
        onClick={onCancel} 
        style={{ animationDuration: '0.3s' }}
      />
      <div
        className="relative w-full max-w-md p-6 border rounded-xl animate-fade-in-scale shadow-2xl"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <h2 id="dialog_title" className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{title}</h2>
        <p id="dialog_desc" className="mt-2 text-base" style={{ color: 'var(--color-text-dim)' }}>{message}</p>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded-lg font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-dim)' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className="px-4 py-2 border border-transparent rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;