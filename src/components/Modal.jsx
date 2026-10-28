import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import '../styles/components/Modal.css';

function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  closeButton = true,
  className = '',
  contentClassName = '',
}) {
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
    sm: 'modal-sm',
    md: 'modal-md',
    lg: 'modal-lg',
    xl: 'modal-xl',
  }[size];

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`modal ${sizeClass} ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {(title || closeButton) && (
          <div className="modal-header">
            <div className="modal-title-section">
              {title && <h2 className="modal-title">{title}</h2>}
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
            {closeButton && (
              <button
                className="modal-close"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={24} />
              </button>
            )}
          </div>
        )}
        <div className={`modal-content ${contentClassName}`.trim()}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
