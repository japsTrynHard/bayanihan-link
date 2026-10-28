import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, subtitle, children, size = 'md', closeButton = true }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-all"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative bg-card rounded-t-xl sm:rounded-lg shadow-2xl border border-border ${sizeClass} max-h-[90vh] overflow-y-auto p-6 sm:p-8 w-full sm:w-auto animate-in slide-in-from-bottom-5 sm:zoom-in-95`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {(title || closeButton) && (
          <div className="flex items-start justify-between mb-4 sm:mb-6">
            <div className="flex-1">
              {title && (
                <h2 id="modal-title" className="text-xl sm:text-2xl font-bold text-foreground">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            {closeButton && (
              <button
                onClick={onClose}
                className="flex-shrink-0 ml-4 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg p-1 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
