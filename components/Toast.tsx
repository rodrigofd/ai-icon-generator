import React, { useState, useEffect } from 'react';

interface ToastProps {
  message: string;
}

const Toast: React.FC<ToastProps> = ({ message }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2800); // slightly less than the css animation
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed top-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg animate-toast-in-out"
      style={{
        animation: 'toast-in-out 3s ease-in-out forwards'
      }}
    >
      {message}
      <style>{`
        @keyframes toast-in-out {
          0% { transform: translateX(100%); opacity: 0; }
          15% { transform: translateX(0); opacity: 1; }
          85% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        .animate-toast-in-out {
          animation-name: toast-in-out;
          animation-duration: 3s;
        }
      `}</style>
    </div>
  );
};

export default Toast;
