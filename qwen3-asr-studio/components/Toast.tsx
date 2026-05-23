import React, { useEffect } from 'react';
import { CloseIcon } from './icons/CloseIcon';

interface ToastProps {
  message: string;
  onClose: () => void;
  type?: 'error' | 'success';
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, type = 'error', duration = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [onClose, duration]);

  const baseClasses = "fixed bottom-4 left-3 right-3 z-50 flex items-start justify-between rounded-lg border p-4 shadow-lg animate-fade-in-up sm:bottom-5 sm:left-auto sm:right-5 sm:w-full sm:max-w-sm";
  const typeClasses = type === 'error'
    ? 'border-red-500/30 bg-red-600 text-white'
    : 'border-brand-primary/30 bg-brand-secondary text-white';
  const buttonHoverClass = type === 'error' ? 'hover:bg-red-700' : 'hover:bg-brand-primary';

  return (
    <div className={`${baseClasses} ${typeClasses}`} role="status" aria-live="polite">
      <p className="flex-grow pr-4">{message}</p>
      <button onClick={onClose} className={`p-1 -m-1 rounded-full ${buttonHoverClass}`}>
        <CloseIcon className="w-5 h-5" />
      </button>
      <style>{`
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
