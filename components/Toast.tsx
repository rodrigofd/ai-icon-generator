import React, { useState, useEffect, useCallback } from 'react';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastProps {
  message: string;
  action?: ToastAction;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, action, onClose }) => {
  const [visible, setVisible] = useState(false);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (message) {
      setVisible(true);
      timer = setTimeout(handleClose, action ? 5000 : 3000);
    } else {
      setVisible(false);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [message, action, handleClose]);

  if (!message) return null;

  const handleActionClick = () => {
    if (action) {
      action.onClick();
      handleClose();
    }
  };

  return (
    <div
      className={`fixed top-5 right-5 z-50 w-auto max-w-sm p-4 border rounded-lg flex items-center justify-between gap-4 transition-all duration-300
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0'}
      `}
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text)',
        boxShadow: 'var(--shadow-lg)'
      }}
    >
      <span>{message}</span>
      {action && (
        <button
          onClick={handleActionClick}
          className="font-bold text-sm whitespace-nowrap uppercase transition-opacity hover:opacity-80"
          style={{ color: 'var(--color-accent)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default Toast;