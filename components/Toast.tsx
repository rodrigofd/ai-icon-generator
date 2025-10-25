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
    const clearTimer = setTimeout(() => {
      onClose();
    }, 300); // Wait for fade-out animation
    return () => clearTimeout(clearTimer);
  }, [onClose]);

  useEffect(() => {
    // FIX: Replaced `NodeJS.Timeout` with `ReturnType<typeof setTimeout>` for browser compatibility.
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (message) {
      setVisible(true);
      const duration = action ? 5000 : 3000;
      timer = setTimeout(handleClose, duration);
    } else {
      setVisible(false);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [message, action, handleClose]);

  if (!message) {
    return null;
  }

  const handleActionClick = () => {
    if (action) {
      action.onClick();
      handleClose();
    }
  };

  return (
    <div
      className={`fixed top-5 right-5 z-50 w-auto max-w-sm rounded-lg shadow-lg text-white p-4 flex items-center justify-between gap-4 transition-all duration-300
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${action ? 'bg-gray-800 dark:bg-gray-700' : 'bg-green-500'}
      `}
    >
      <span>{message}</span>
      {action && (
        <button
          onClick={handleActionClick}
          className="font-bold text-purple-300 hover:text-purple-200 underline text-sm whitespace-nowrap"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default Toast;